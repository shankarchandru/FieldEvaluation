define([
    "dojo/_base/declare",
	"dojo/request",
	"esri/tasks/datareviewer/ReviewerResultsTask",
	"esri/tasks/datareviewer/DashboardTask",
	"esri/tasks/datareviewer/GetResultsQueryParameters",
	"esri/tasks/datareviewer/ReviewerFilters",
	"esri/tasks/datareviewer/ReviewerLifecycle",
	"dojo/store/util/QueryResults",
	"dojo/store/util/SimpleQueryEngine",
	"dojo/_base/lang",
	"dojo/_base/array"
], function(declare,request,ReviewerResultsTask,DashboardTask,GetResultsQueryParameters,ReviewerFilters,ReviewerLifecycle,QueryResults,SimpleQueryEngine,lang, arrayUtil){
    return declare(null, {
		idProperty: "recordId",
		queryEngine: SimpleQueryEngine,
		_resultsTask: null,
		_queryParameters: null,
		_lastQuery: null,
		lastQuery:null,
		_total: 0,
		
        constructor: function (options) {
			declare.safeMixin(this, options);
			this._queryParameters = new GetResultsQueryParameters();
			if(typeof this.pageSize != "undefined")
				this._queryParameters.pageSize = this.pageSize;
			else
				this._queryParameters.pageSize = 100;
            this._queryParameters.pageNumber = 0;
            this._queryParameters.sortBy = "recordId";
            this._queryParameters.sortDescending = false;
            this._queryParameters.returnFields = this.returnFields;
			
			if(typeof this.drsSoeUrl === "undefined")
				this.drsSoeUrl = "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer";
				
			this._resultsTask = new ReviewerResultsTask(this.drsSoeUrl);
		},
        getIdentity: function (object) {
			return object[this.idProperty];
		},
		
        get: function (id) {
			var filter = new ReviewerFilter();
			filter.addAttributeFilter(this.idProperty,[id]);
			
			this._resultsTask.getResults(this._queryParameters, filter).then(function(responseData) {
				var data = arrayUtil.map(responseData.featureSet.features, function(feature) {
					return feature.attributes;
				});
				return data;
			});
		},
		
        query: function (query, options) {
		
			options = options || {};
			
			if(options.sort) {
				this._queryParameters.sortBy = options.sort[0].attribute;
				this._queryParameters.sortDescending = options.sort[0].descending;
			}
			
                        //parse query parameter and returns a ReviewerFilters object.
			var filters = this._getFiltersFromQuery(query);
			
			var pageSize = this._queryParameters.pageSize;
			var start = options.start || 0;
			if(start != 0 && pageSize - (start % pageSize) <= 10)
				start += pageSize - (start % pageSize);
				
			var pageNumber = ~~(start / pageSize); //~~ rounds result of divsion to integer
			this._queryParameters.pageNumber = pageNumber;
			
			var dfdResults = null;
			if(filters.getCount() > 0)
				dfdResults = this._resultsTask.getResults(this._queryParameters,filters);
			else
				dfdResults = this._resultsTask.getResults(this._queryParameters);
				
			var queryResults = new QueryResults(dfdResults.then(lang.hitch(this, function(responseData) {
				//create array of rows from response data
				var data = arrayUtil.map(responseData.featureSet.features, lang.hitch(this, function(feature) {
					return feature.attributes;
				}));

				return data;
			}), function(err) {
					return []; //empty array
				})
			);
			
			if(this._areQueriesEqual(this._lastQuery, query))
				queryResults.total = this._total;
			else
				queryResults.total = this._getCount(query);
			
			this._lastQuery = query;
						
			return queryResults;
		},
		
		_getCount: function(query) {
			//use DashboardTask to get total count of records being queried
			var filters = this._getFiltersFromQuery(query);
			
			var dashboardTask = new DashboardTask(this.drsSoeUrl);
			var dfd = null;
			if(filters.getCount() > 0)
				dfd = dashboardTask.getDashboardResults("SEVERITY", filters);
			else
				dfd = dashboardTask.getDashboardResults("SEVERITY");
				
			return dfd.then(lang.hitch(this, function(response) {
				var results = response.dashboardResult;
				var total = 0;
				arrayUtil.forEach(results.fieldValues, function(item, i) {
					total += results.getCount(item);
				});
				this._total = total;
				return total;
			}));
		},
		
		_getFiltersFromQuery: function(query) {
			
			var filters = new ReviewerFilters();
			//parse query into filters
			switch(typeof query) {
				case "object":
					for(var key in query) {
						var keyName = key;
						filters.addAttributeFilter(keyName.toLowerCase(), query[key]);
					}
					break;
				case "string":
					throw new Error("string query not supported");
					break;
				default:
					break;//no filters
			}
			
			return filters;
		},
		
		_areQueriesEqual: function(queryOne, queryTwo) {
			if( (null == queryOne || null == queryTwo) && !(null == queryOne && null == queryTwo)) //XOR
				return false;
			if( null == queryOne && null == queryTwo)
				return true;
			if(typeof queryOne != typeof queryTwo)
				return false;
			if(typeof queryOne == "string")
				return queryOne == queryTwo;
			if(typeof queryOne == "object") {
				var queryOneCount = 0;
				for(var keyOne in queryOne) {
					queryOneCount++;
					var fieldNameOne = keyOne;
					var equals = false;
					for(var keyTwo in queryTwo) {
						var fieldNameTwo = keyTwo;
						if(fieldNameOne.toLowerCase() == fieldNameTwo.toLowerCase() && queryOne[keyOne] == queryTwo[keyTwo]) {
							equals = true;
							break;
						}
					}
					if(!equals)
						return false;
				}

				var queryTwoCount = 0;
				for(var keyTwo in queryTwo)
					queryTwoCount++;
					
				return queryOneCount == queryTwoCount;
			}
			else
				return true;
		}
        
    });
});