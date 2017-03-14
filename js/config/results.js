define({
	map: true,
	drsSoeUrl : "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer",
	columns:[
			{label:"Lifecycle Status",field:"lifecycleStatus", formatter : function(value){ if(value == 10){return "<img src='./images/GenericAsteriskGreen16.png' />";}else if(value == 11){return "<img src='./images/DataReviewerLifecycleVerified16.png' />";} else if(value == 12) {return "<img src='./images/DataReviewerLifecycleReviewed16.png' />";} else{return "<img src='./images/DataReviewerLifeCycleUnknown16.png' />";}} },
			{label:"Check Title",field:"checktitle"},
			{label:"Resource",field:"resourceName"},
			{label:"Status",field:"reviewStatus"},
			{label:"Severity",field:"severity"},
			{label:"Lifecycle Phase",field:"lifecylePhase", formatter : function(value){var phaseString; require(['esri/tasks/datareviewer/ReviewerLifecycle'],function(ReviewerLifecycle) {
				phaseString = ReviewerLifecycle.toLifecyclePhaseString(value);
			});
			return phaseString; } }
	],
	returnFields: ["recordId","objectId","checktitle","resourceName","reviewstatus","severity","geometryType","lifecyclePhase","lifecycleStatus"]
});
