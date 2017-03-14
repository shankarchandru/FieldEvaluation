define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
	'dojox/layout/TableContainer',
	'dijit/layout/TabContainer',
	'dijit/layout/ContentPane',
    'dijit/form/Form',
    'dijit/form/ValidationTextBox',
	'dijit/form/Textarea',
	'dijit/form/DateTextBox',
    'dijit/form/CheckBox',
	'dojox/form/Uploader',
	'dojox/form/uploader/FileList',
	'dojox/form/FileUploader',
	'dojo/on',
    'dojo/dom',
	'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/_base/lang',
    'dojo/_base/Color',
    'dojo/_base/array',
    'dojo/store/Memory',
	'dojo/Evented',
	'dojox/timing',
    'dgrid/OnDemandGrid',
	'dgrid/extensions/DijitRegistry',
	'dgrid/extensions/ColumnResizer',
    'dgrid/Selection',
    'dgrid/Keyboard',
	'dijit/registry',
	'dijit/tree/ObjectStoreModel',
	'dijit/Tree',
	'dijit/ProgressBar',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/layers/FeatureLayer',
    'esri/graphicsUtils',
    'esri/geometry/Extent',
	'esri/tasks/datareviewer/BatchValidationTask',
	'esri/tasks/datareviewer/BatchValidationParameters',
	'esri/tasks/datareviewer/ReviewerSession',
	'esri/tasks/datareviewer/SessionOptions',
	'esri/tasks/datareviewer/ReviewerResultsTask',
	'esri/tasks/datareviewer/ReviewerFilters',
	'esri/tasks/datareviewer/GetResultsQueryParameters',
	'dijit/form/Select',
    'dojo/text!./ValidateData/templates/ValidateData.html',
    'xstyle/css!./ValidateData/css/ValidateData.css',
	'xstyle/css!./ValidateData/css/FileUploader.css'
], function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, TableContainer, TabContainer, ContentPane,Form, ValidationTextBox, Textarea, DateTextBox,CheckBox, Uploader,FileList,FileUploader,on,dom, Deferred, domConstruct, domClass, lang, Color, array, Memory, Evented, DojoxTimer,OnDemandGrid, DijitRegistry,ColumnResizer,Selection, Keyboard, Registry,ObjectStoreModel,DijitTree,DijitProgress, GraphicsLayer, Graphic, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, FeatureLayer, graphicsUtils, Extent, BatchValidationTask,BatchValidationParameters,ReviewerSession,SessionProperties,ReviewerResultsTask, ReviewerFilters, GetResultsQueryParameters, Select, FindTemplate, css,fileUploadercss) {

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
		treeModel : null,
        _progressSanityDiv : null,
        _progressDiv : null,
        // default Spatial Reference
        outputSpatialReference: 4326,
        // default symbology for found features
        defaultSymbols: {
            point: {
                type: 'esriSMS',
                style: 'esriSMSCircle',
                size: 25,
                color: [0, 255, 255, 255],
                angle: 0,
                xoffset: 0,
                yoffset: 0,
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 0, 0, 255],
                    width: 2
                }
            },
            polyline: {
                type: 'esriSLS',
                style: 'esriSLSSolid',
                color: [0, 0, 255, 255],
                width: 3
            },
            polygon: {
                type: 'esriSFS',
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: [0, 255, 255, 32],
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [0, 255, 255, 255],
                    width: 3
                }
            }
        },

        postCreate: function () {
            this.inherited(arguments);

			this.bvTask = new BatchValidationTask(this.drsSoeUrl);
			this.resultsTask = new ReviewerResultsTask(this.drsSoeUrl);
            var pointSymbol = null, polylineSymbol = null, polygonSymbol = null;
            var pointRenderer = null, polylineRenderer = null, polygonRenderer = null;
			


            var symbols = lang.mixin({}, this.symbols);
            // handle each property to preserve as much of the object hierarchy as possible
            symbols = {
                point: lang.mixin(this.defaultSymbols.point, symbols.point),
                polyline: lang.mixin(this.defaultSymbols.polyline, symbols.polyline),
                polygon:  lang.mixin(this.defaultSymbols.polygon, symbols.polygon)
            };

            // points
            this.pointGraphics = new GraphicsLayer({
                id: 'findGraphics_point',
                title: 'Find'
            });

            if (symbols.point) {
                pointSymbol = new SimpleMarkerSymbol(symbols.point);
                pointRenderer = new SimpleRenderer(pointSymbol);
                pointRenderer.label = 'Find Results (Points)';
                pointRenderer.description = 'Find results (Points)';
                this.pointGraphics.setRenderer(pointRenderer);
            }

            // poly line
            this.polylineGraphics = new GraphicsLayer({
                id: 'findGraphics_line',
                title: 'Find Graphics'
            });

            if (symbols.polyline) {
                polylineSymbol = new SimpleLineSymbol(symbols.polyline);
                polylineRenderer = new SimpleRenderer(polylineSymbol);
                polylineRenderer.label = 'Find Results (Lines)';
                polylineRenderer.description = 'Find Results (Lines)';
                this.polylineGraphics.setRenderer(polylineRenderer);
            }

            // polygons
            this.polygonGraphics = new GraphicsLayer({
                id: 'findGraphics_polygon',
                title: 'Find Graphics'
            });

            if (symbols.polygon) {
                polygonSymbol = new SimpleFillSymbol(symbols.polygon);
                polygonRenderer = new SimpleRenderer(polygonSymbol);
                polygonRenderer.label = 'Find Results (Polygons)';
                polygonRenderer.description = 'Find Results (Polygons)';
                this.polygonGraphics.setRenderer(polygonRenderer);
            }

            this.map.addLayer(this.polygonGraphics);
            this.map.addLayer(this.polylineGraphics);
            this.map.addLayer(this.pointGraphics);

            var k = 0, queryLen = this.queries.length;

            // add an id so it becomes key/value pair store
            for (k = 0; k < queryLen; k++) {
                this.queries[k].id = k;
            }
            this.queryIdx = 0;
			

		
			var props = {
			isDebug:false,
			/*activeClass:"uploadPress",*/
			uploadUrl: "upload.php",
			uploadOnSelect :true,
			fileMask:[
					["ZIP File","*.zip"]
				]
			};
			
			if(this.uploadDijit){
				this.uploadedFilesDijit.value = "";
				var h = new dojox.form.Uploader(lang.mixin({
					force:"html",
					postData:"POST",
					/*progressWidgetId:"progressBarHtml",*/ 
					onComplete:lang.hitch(this,this.enableControls),
					selectMultipleFiles:false
					/*fileListId:"hFiles",
					tabIndex:11,
					htmlFieldName:"hFiles"*/
			}, props), this.uploadDijit);
			h.startup();

			};

            if(this.uploadSanityDijit){
                this.uploadedFilesSanityDijit.value = "";
                var h = new dojox.form.Uploader(lang.mixin({
                    force:"html",
                    postData:"POST",
                    /*progressWidgetId:"progressBarHtml",*/
                    onComplete:lang.hitch(this,this.enableSanityControls),
                    selectMultipleFiles:false
                    /*fileListId:"hFiles",
                     tabIndex:11,
                     htmlFieldName:"hFiles"*/
                }, props), this.uploadSanityDijit);
                h.startup();

            }

            this._progressSanityDiv = Registry.byId("ProgressSanity");
            this._progressDiv = Registry.byId("Progress");

            if(this._progressSanityDiv) {
                this._progressSanityDiv.domNode.style.visibility = 'hidden';
            };
            if(this._progressDiv) {
                this._progressDiv.domNode.style.visibility = 'hidden';
            };

        },

        resize: function() {
            if(this.tabContainer && this.tabContainer.resize)
                this.tabContainer.resize();
        },

		//Check Status of Execution
		checkJobProgress : function (sessionId, ratio,value) {

            var progressDijitName;
            var progressDiv;
            if(value == true) {
                progressDijitName = this.ProgressDijitSanity;
                progressDiv = this._progressSanityDiv;
            }
            else {
                progressDijitName = this.ProgressDijit;
                progressDiv = this._progressDiv;
            }
			this.timer = new Timer();
			this.tickCounter = 1;
			if (!this.jobID) {
				return;
			}
			else{
                progressDijitName.set({ maximum: 100, value: (this.tickCounter * ratio) });
				this.timer.start();
				this.timer.on("tick",lang.hitch(this, function () {
					console.log("tick...");
					this.tickCounter = this.tickCounter + 1;
                    progressDijitName.set({ maximum: 100, value: (this.tickCounter * ratio) });
					this.getExecutionDetails(this.jobID).then ( lang.hitch(this, function(response) {
					if(response  && response.jobInfo  && response.jobInfo.status == "Completed"){
						console.log("counter value " + (this.tickCounter * ratio));
                        progressDijitName.set({ maximum: 100, value: 100 });
						if(progressDiv) {
							progressDiv.domNode.style.visibility = 'hidden';
                            progressDijitName.set({ maximum: 100, value: 0 });
						}
						this.timer.stop();
						this.populateGrid(sessionId);
					}
				}));
			 }));
			} //end else loop to check job progress
		},		
		
		//Managing UI Controls
/*		enableSanityControls : function (result) {
			//set label for uploaded file name
			this.uploadedFilesSanityDijit.value = result.uploadedfile.name;
			//Enable Run Batch Jobs buttons
			this.executeSanityDijit.disabled = false;
		},
*/

        //Managing UI Controls
        enableControls : function (result) {
            //set label for uploaded file name
            this.uploadedFilesDijit.value = result.uploadedfile.name;
            //Enable Run Batch Jobs buttons
            this.scheduleJobDijit.disabled = false;
        },

		//View Results of Validation
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
		
		//Execute Sanity Job to find missing attribution values and orphaned features
/*        executeSanityJob: function () {
			
			
			//1. Title (Optional)
            //2. Session (Required)
            //3. File Item ID (Required)
            //4. CreatedBy (Optional)
			
			//Step1 : Get Uploaded Data to run validation
			
			var fgdbZipFileName;
			if(this.uploadedFilesSanityDijit){
				if(!this.uploadedFilesSanityDijit.value)  {
				   alert("Please upload data properly and try again");
				   return;
				}else {
					fgdbZipFileName = this.uploadedFilesSanityDijit.value;
				}
				
			}else {
				alert("Please upload data properly and try again");
				return;
			}
			
			var fgdbName = fgdbZipFileName.substring(0,fgdbZipFileName.lastIndexOf("."));
			
			
			//Step 1 : Upload Sanity Batch Job
			
			var batchJobFileUploadURL = this.serverUploadURL;

			
            //Step 2 : Set up Validation parameters to run a Sanity check on the uploaded data.

            //Set Validation Parameters based on user input
            var bvParameters = new BatchValidationParameters();
            bvParameters.title = this.title.value;
			//Set up Batch Job rules to run against the data.
            bvParameters.fileItemId =  "i63e1bb93-3c5e-446c-bb82-3acbb9004c1a";// Sanity Batch job uploaded to Server
			bvParameters.sessionString = "Session 1 : "; //Define a group to write results
            bvParameters.changedFeaturesOnly = false; // Run on everything
			bvParameters.productionWorkspace = this.serverUploadFolder + fgdbName;  //Point to data to run Sanity checks
            bvParameters.createdBy = this.contributorName.value; // Define the contributor information 
			var sessionId = 1;
			
			//Step3 : Run validation

			var deferred = this.bvTask.executeJob(bvParameters);

			//Step4 : Track progress of validation
			deferred.then(lang.hitch(this,function(response) {
			   this.jobID = response.jobId;
			   if(this._progressSanityDiv)
                   this._progressSanityDiv.domNode.style.visibility = 'visible';
			   this.checkJobProgress(sessionId,2.5,true);
			}), lang.hitch(this,function(error) {
				console.log("error : Unable to execute job");
			}));			
         },
*/		 

		//Execute Quality Control Batch Job
		scheduleQCJob : function () {
           //1. Title (Optional)
            //2. Session (Required)
            //3. File Item ID (Required)
            //4. CreatedBy (Optional)
			
			//Step 1: Create a Reviewer Session to store and provide summaries of the results			
			
			var sessionString;
			var sessionName;
			var contributorName;
			var sessionId;
			
			//Get Session info from logged In user
			sessionString = "Session 7 : TestSession";
			sessionId = 7;			
			
			var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
			if(!user.isAdmin)
			{
				sessionString = user.username;
				sessionid = user.sessions[0];
			}
			
			//this.createSession(this.contributorName.value).then(lang.hitch(this,function(response) {
				//sessionString = "Session <ID> : Session Name";

				
				//Step 2: Get Uploaded Data to run validation 
				
				var fgdbZipFileName;
				if(this.uploadedFilesDijit){
					if(!this.uploadedFilesDijit.value)  {
					   alert("Please upload data properly and try again");
					   return;
					}else {
						fgdbZipFileName = this.uploadedFilesDijit.value;
					}
				}else { 
					alert("Please upload data properly and try again");
					return;
				}
				var fgdbName = fgdbZipFileName.substring(0,fgdbZipFileName.lastIndexOf("."));
				
				
				//Step 3: Set Batch Validation Parameters based on Contributor information
				
				var bvParameters = new BatchValidationParameters();
				bvParameters.title = this.title.value; // User defined title for the data upload
				bvParameters.fileItemId =  "ibda4fbc8-90ee-4e1d-974f-c49752f0e895";// Address Validation Batch Job to validate the uploaded data
				bvParameters.sessionString = sessionString;
				bvParameters.changedFeaturesOnly = false;
				bvParameters.productionWorkspace = this.serverUploadFolder + fgdbName;  //Server uploaded path directory
				bvParameters.createdBy = sessionName; //Contributor Name
				
				
				//Step 4: Execute Rules based on organization configured rules (Batch Jobs)
				
				var deferred = this.bvTask.executeJob(bvParameters);

				//Deferred callback and errorback function //Get Execution Details to ensure successful run
				deferred.then(lang.hitch(this,function(response) {
				   this.jobID = response.jobId;
				   if(this._progressDiv)
						this._progressDiv.domNode.style.visibility = 'visible';
				   this.checkJobProgress(sessionId,1,false);
				}), lang.hitch(this,function(error) {
				}));							
			//}));
		},		 
		
		//Gets Job Execution Details using BatchValidationTask.getJobExecutionDetails.
		getExecutionDetails: function (jobId) {
			// we're using dojo deferred 'then' function to call a callback function and errback function
			var deferred = this.bvTask.getJobExecutionDetails(jobId);
			//Deferred callback and errback function
			deferred.then(function(response) {
				var jobDetails = response.jobInfo.status;
				return response.jobInfo.status;
			}, function(error) {
			});
			return deferred.promise;
		},

		//Creates a Reviewer Session to group results
		createSession: function (sessionName) {
			if(sessionName)
			{
				// we're using dojo deferred 'then' function to call a callback function and errback function
				var sessionProperties=new SessionProperties();
				sessionProperties.username  = sessionName;
				sessionProperties.versionName = "";
				sessionProperties.duplicateFilter = "None";
				sessionProperties.storeGeometry = true;
				var deferred = this.bvTask.createReviewerSession(sessionName,sessionProperties);
				//Deferred callback and errback function
				deferred.then(lang.hitch(this,function(response) {
					return response.reviewerSession;
				}),lang.hitch(this,function(error) {
					console.log("error : Unable to create reviewer session");
				}));
				return deferred.promise;
			}
		}
    });
});