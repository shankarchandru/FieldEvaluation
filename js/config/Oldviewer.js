define([
	'esri/InfoTemplate',
	'esri/units',
	'esri/geometry/Extent',
	'esri/config',
	'esri/tasks/GeometryService',
	'esri/layers/FeatureLayer'
], function(InfoTemplate, units, Extent, esriConfig, GeometryService, FeatureLayer) {

	// url to your proxy page, must be on same machine hosting you app. See proxy folder for readme.
	esriConfig.defaults.io.proxyUrl = 'webapps/proxy/proxy.ashx';
	esriConfig.defaults.io.alwaysUseProxy = false;
	// url to your geometry server.
	esriConfig.defaults.geometryService = new GeometryService('http://localhost:6080/arcgis/rest/services/Utilities/Geometry/GeometryServer');

	return {
		//default mapClick mode, mapClickMode lets widgets know what mode the map is in to avoid multipult map click actions from taking place (ie identify while drawing).
		defaultMapClickMode: 'identify',
		// map options, passed to map constructor. see: https://developers.arcgis.com/javascript/jsapi/map-amd.html#map1
		mapOptions: {
			basemap: 'topo', 
			//xmax: -9812375.76569925 xmin: -9813198.06091771 ymax: 5126760.049639163 ymin: 5126222.004619676
			extent: new Extent({xmin: -9812424.29388698,ymin:5129485.830449284,xmax:-9812067.488227712,ymax:5129729.174894727,
			spatialReference:{latestwkid:3857,wkid:102100}}),
			sliderStyle: 'small'
		},
		// operationalLayers: Array of Layers to load on top of the basemap: valid 'type' options: 'dynamic', 'tiled', 'feature'.
		// The 'options' object is passed as the layers options for constructor. Title will be used in the legend only. id's must be unique and have no spaces.
		// 3 'mode' options: MODE_SNAPSHOT = 0, MODE_ONDEMAND = 1, MODE_SELECTION = 2
		operationalLayers: [/*{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/WaterDistributionServices/WaterDistributionService/FeatureServer/5',
			title: 'Water Hydrants',
			options: {
				id: 'waterhydrants',
				opacity: 0.5,
				visible: true,
				outFields: ['facilityid','locdesc','rotation','operable','enabled'],
				//infoTemplate: new InfoTemplate('Attributes', '${*}'),
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}
		},*/{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/0',
			title: 'Census Tract - Reference Layer',
			options: {
				id: 'censusTract_ReferenceLayer',
				opacity: 0.5,
				visible: true,
				outFields: ['name','countyfp','statefp','funcstat'],
				//infoTemplate: new InfoTemplate('Attributes', '${*}'),
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}
		},{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/3',
			title: 'Address - Entrance Points',
			options: {
				id: 'address_EntrancePoints',
				opacity: 1.0,
				visible: true,
				outFields: ['entranceptid','siteaddkey','pointtype','capturemeth'],
				//infoTemplate: new InfoTemplate('Attributes', '${*}'),
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}
		},{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/4',
			title: 'Site Address Points',
			options: {
				id: 'address_SiteAddPoints',
				opacity: 1.0,
				visible: true,
				outFields: ['siteaddid','unittype','fulladdr','placename','esn','status'],
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}		
		},{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/2',
			title: 'Address Points',
			options: {
				id: 'address_Points',
				opacity: 1.0,
				visible: true,
				outFields: ['addressptid','pointtype','capturemeth','lastupdate'],
				//infoTemplate: new InfoTemplate('Attributes', '${*}'),
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}			
		},{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/11',
			title: 'Building Footprints',
			options: {
				id: 'building_Footprints',
				opacity: 1.0,
				visible: true,
				outFields: ['featurecode','bldgheight','numstories','lastupdate'],
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}				
		},{
			type: 'feature',
			url: 'http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement/FeatureServer/12',
			title: 'Owner Parcels',
			options: {
				id: 'owner_Parcels',
				opacity: 1.0,
				visible: true,
				outFields: ['ownparcelid','owntype','siteaddid','placename','addrnum','lastupdate','addrclass'],
				mode: FeatureLayer.MODE_ONDEMAND
			},
			editorLayerInfos: {
				disableGeometryUpdate: false,
				disableAttributeUpdate: false
			}			
		}],
		// set include:true to load. For titlePane type set position the the desired order in the sidebar
		widgets: {
			identify: {
				include: true,
				id: 'identify',
				type: 'invisible',
				path: 'gis/dijit/Identify',
				options: 'config/identify'
			},
			scalebar: {
				include: true,
				id: 'scalebar',
				type: 'map',
				path: 'esri/dijit/Scalebar',
				options: {
					map: true,
					attachTo: 'bottom-left',
					scalebarStyle: 'line',
					scalebarUnit: 'dual'
				}
			},
			homeButton: {
				include: false,
				id: 'homeButton',
				type: 'domNode',
				path: 'esri/dijit/HomeButton',
				srcNodeRef: 'homeButton',
				options: {
					map: true,
					extent: new Extent({
						xmin: -180,
						ymin: -85,
						xmax: 180,
						ymax: 85,
						spatialReference: {
							wkid: 4326
						}
					})
				}
			},
			legend: {
				include: true,
				id: 'legend',
				type: 'titlePane',
				path: 'esri/dijit/Legend',
				title: 'Legend',
				open: false,
				position: 0,
				options: {
					map: true,
					legendLayerInfos: true
				}
			},
			TOC: {
				include: true,
				id: 'toc',
				type: 'titlePane',
				path: 'gis/dijit/TOC',
				title: 'Layers',
				open: false,
				position: 1,
				options: {
					map: true,
					tocLayerInfos: true
				}
			},
			bookmarks: {
				include: false,
				id: 'bookmarks',
				type: 'titlePane',
				path: 'gis/dijit/Bookmarks',
				title: 'Bookmarks',
				open: false,
				position: 2,
				options: 'config/bookmarks'
			},
			ValidateData: {
                include: true,
				id: 'ValidateData',
				type: 'titlePane',
				path: 'gis/dijit/ValidateData',
                title: 'ValidateData',
                open: false,
                position: 3,
				options: 'config/ValidateData'
            },
			draw: {
				include: true,
				id: 'draw',
				type: 'titlePane',
				path: 'gis/dijit/Draw',
				title: 'Report Feedback',
				open: false,
				position: 5,
				options: 'config/Draw'
			},
			ReviewerDashboard: {
				include: true,
				id: 'Dashboard',
				type: 'titlePane',
				path: 'gis/dijit/ReviewerDashboard',
                title: 'Reviewer Dashboard',
                open: false,
                position: 4,
				options: 'config/dashboard'
			},
			ReviewerResultsGrid : {
				include :true,
				id:'ResultsGrid',
				type:'bottomPane',
				path : 'gis/dijit/ReviewerResultsGrid',
				title: 'Reviewer Results',
				open: false,
				position: 0,
				options: 'config/results'
			},
			Editor: {
				include :true,
				id:'Editor',
				type:'titlePane',
				path : 'gis/dijit/Editor',
				title: 'Editing',
				open: false,
				position: 6,
				options: 'config/Editor'
			}
		}
	};
});
