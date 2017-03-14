define({
	title: "Report Feedback",
	map: true,
	mapClickMode: true,
	queries: [
		{
			description: 'Naperville Water Data',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer',
		},
		{
			description: 'Find Incident By Code/Description',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
		}
	],
	drsSoeUrl : "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer",
	serverUploadFolder : "c:\\arcgisserver\\data\\",
	bvTask : null,
	bvParameters : null,
	resultsTask : null,
	_resultGeometry : null,
	myStore : null,
	myModel : null,
	outFields : ["recordId","objectId","checktitle","resourceName","reviewStatus","severity","geometryType","SESSIONID"],
	contributorSessionString : "1219",
	includeReportedBy : "FieldTech2"
});