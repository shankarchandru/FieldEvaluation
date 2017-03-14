define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
	'dijit/layout/ContentPane',
	'dijit/registry',
	'dojo/on',
    'dojo/dom',
	'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/_base/lang',
    'dojo/_base/Color',
    'dojo/_base/array',
	'dojo/request',
	'dojo/Evented',
	'dojox/timing',
	'dijit/ProgressBar',
	'esri/request',
	'esri/ServerInfo',
	'esri/tasks/datareviewer/BatchValidationTask',
	'esri/tasks/datareviewer/BatchValidationParameters',
	'esri/tasks/datareviewer/ReviewerSession',
	'esri/tasks/datareviewer/SessionOptions',
	'esri/tasks/datareviewer/ReviewerResultsTask',
	'esri/tasks/datareviewer/ReviewerFilters',
	'esri/tasks/datareviewer/GetResultsQueryParameters',
    'dojo/text!./ValidateData/templates/ValidateData.html',
    'xstyle/css!./ValidateData/css/ValidateData.css',
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane, Registry, on, dom, Deferred, domConstruct, domClass, lang, Color, array,
			 request, Evented, DojoxTimer, ProgressBar, esriRequest, ServerInfo, BatchValidationTask,BatchValidationParameters,ReviewerSession,SessionProperties,ReviewerResultsTask,
			 ReviewerFilters, GetResultsQueryParameters, FindTemplate, css) {

	 // Declare the new Timer class
	  var Timer = declare([Evented], {
		timeout: 1000,
		start: function(){
		  this.stop();
		  this.emit("start", {});
		  var self = this;
		  this._handle = setInterval(function(){
			self.emit("tick", {});
		  }, this.timeout);
		},
		stop: function(){
		  if(this._handle){
			clearInterval(this._handle);
			delete this._handle;
			this.emit("stop", {});
		  }
		}
	  }); 
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: FindTemplate,
        baseClass: 'validateData',
		_lastExecution: null,

        postCreate: function () {
            this.inherited(arguments);

			this.bvTask = new BatchValidationTask(this.drsSoeUrl);
			this.timer = new Timer();
        },
		
        resize: function() {
		},
          
		//Checks Job Progress
		//Sets up a timer to check periodically
		//Calls BatchValidationTask.getJobExecutionDetails method
		//Check the Job Execution status and terminates the progress when done
		checkJobProgress : function () {

			if (!this.jobID) {
				return;
			}
			else{
				this.timer.start();
				this.timer.on("tick",lang.hitch(this, function () {
					console.log("tick...");

					this.getExecutionDetails(this.jobID).then ( lang.hitch(this, function(response) {
						if(response && response.jobInfo) {

							if(String(response.jobInfo.status).toUpperCase() == "COMPLETED") {

								this.setVisibility("imgExecuting", false);
								dom.byId("lblExecuting").innerHTML = response.jobInfo.status;

								this.timer.stop();
								this.populateGrid(5); //Set SessionId = 5 for Demo purposes
							}
							else {
								dom.byId("lblExecuting").innerHTML = response.jobInfo.status + "...";
								//console.log(response.jobInfo.messages);
								if(String(response.jobInfo.status).toUpperCase() == "FAILED")
									this.timer.stop();
							}
            			}
					}), function(error) {
						//if(error.indexOf("not yet started") < 0) {
							console.log("Error getting execution details. " + error);
						//	this.timer.stop();
						//}
					});
			 	}));
			} //end else loop to check job progress
		},		

		setVisibility: function(elementId, visible) {
			var el = dom.byId(elementId);
			if(null != el) {
				if(visible)
					el.style.visibility = 'visible';
				else
					el.style.visibility = 'hidden';
			}
		},

        // Based on the results of execution runs a query to get results
		// Loads the results grid with some results
		populateGrid : function(sessionId) {
        
			// show Grid Loading animation
			//gridStandby.show();
			if(!app.isPaneOpen("bottombar"))
				app.togglePane("bottombar");
        
			var grid = Registry.byId("ResultsGrid_widget");
			var query = {};
			query["sessionid"] = parseInt(sessionId);
        
			grid.setQuery(query);
        
		}, //End populateGrid function

		// Execute validation
		executeValidation: function () {
			

            //Set Sample Validation Parameters
            var bvParameters = new BatchValidationParameters();
            bvParameters.title = "Get Sample to Review";
            bvParameters.fileItemId =  "ia3897b0b-18f0-4c80-9e00-9adaf5e2c5b2";// Get Sample using Sample Check
			bvParameters.sessionString = "Session 5 : Fieldtech1"; // Session to Review Samples from
			bvParameters.productionWorkspace = this.serverUploadFolder + "MobileData.gdb";  //Contributor Collected data
            bvParameters.changedFeaturesOnly = false; // Run on everything
            bvParameters.createdBy = "Fieldtech1";
			var deferred = this.bvTask.executeJob(bvParameters);

			//Step4 : Track progress of validation 
			deferred.then(lang.hitch(this,function(response) {
			   	this.jobID = response.jobId;
				this.setVisibility("imgExecuting", true);
				this.setVisibility("lblExecuting", true);
			   	this.checkJobProgress();
			}), function(error) {
				console.log("error : Unable to execute job. " + error);
			});
         },		

		//Gets Job Execution Details using BatchValidationTask.getJobExecutionDetails.
		getExecutionDetails: function (jobId) {
            // we're using dojo deferred 'then' function to call a callback function and errback function
            return this.bvTask.getJobExecutionDetails(jobId);
         }	
    });
});