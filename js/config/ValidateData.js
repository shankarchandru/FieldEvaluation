define({
	map: true,
	queries: [
		{
			description: 'Find A Public Safety Location By Name',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
			layerIds: [1,2,3,4,5,6,7],
			searchFields: ['FDNAME, PDNAME', 'NAME', 'RESNAME'],
			minChars: 2
		},
		{
			description: 'Find Incident By Code/Description',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
			layerIds: [15,17,18],
			searchFields: ['FCODE','DESCRIPTION'],
			minChars: 4
		}
	],
	drsSoeUrl : "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer",
	serverUploadFolder : "c:\\arcgisserver\\data\\uploads\\",
	serverUploadURL : "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/uploads/upload",
	bvTask : null,
	bvParameters : null,
	resultsTask : null,
	jobID : null,
	myStore : null,
	myModel : null,
	outFields : ["recordId","objectId","checktitle","resourceName","reviewStatus","severity","geometryType","SESSIONID"],
	contributorSessionString : "5",
	contributorSessionString : "Session 1 : Team A",
	sanityResultsDGrid : null,
	timer : null,
	tickCounter : null,
	sessionsList : null
});