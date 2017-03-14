define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/query',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'esri/tasks/datareviewer/ReviewerAttributes',
  'dojo/text!./Draw/templates/DrawErrorInfoWindowContent.html',
  'dojox/validate',
  'dojox/validate/check',
  'dojo/NodeList-dom',
  'xstyle/css!./Draw/css/DrawErrorInfoWindowContent.css'
], function(
  declare, array, lang, on, domConstruct, domClass, query,
  _WidgetBase, _TemplatedMixin,
  ReviewerAttributes,
  template,
  validate
) {
  return declare([_WidgetBase, _TemplatedMixin], {
    baseClass: 'drs-draw-error-info-window',
    templateString: template,

    // custom setters
    _setGraphicAttr: function(newGraphic) {
      this.setGraphic(newGraphic);
    },
    _setLayerNameAttr: function(layerName) {
      this.setLayerName(layerName);
    },
     postCreate: function() {
      this.inherited(arguments);
      this._initEvents();
    },

    // wire up events 
    _initEvents: function() {
      var _this = this;
      this.own(on(this.formNode, 'submit', function(e) {
        e.preventDefault();
        _this._onFormSubmit();
      }));
      this.own(on(this.cancelNode, 'click', function(e) {
        e.preventDefault();
        _this._onCancel();
      }));	  
    },

    // clear form
    // Set layer name of selected feature.
    setLayerName: function(layerName) {
      this.formNode.reset();
      //this.layerName = layerName;
      if (!this.reviewerAttributes) {
        this.reviewerAttributes = new ReviewerAttributes();
      }
      //this.reviewerAttributes.resourceName = layerName;
      this.reviewerAttributes.severity = 5; // default
      this.reviewerAttributes.lifecycleStatus = 1; // default
      //this.layerNode.innerHTML = this.layerName;
      this.statusNode.focus();
    },

    // TODO: remove, not used by this widget
    // get graphic to submit with report
    setGraphic: function(newGraphic) {
      this.graphic = newGraphic;
    },
	
	setLayers : function (layers) {
		if(null == layers)
			return;
		this.formNode.reset();
		array.forEach(layers, lang.hitch(this,function(layer, i) {
						var option = new Option(layer.name, layer.name);
						this.layerNode.options.add(option);
					}));
      
      if (!this.reviewerAttributes) {
        this.reviewerAttributes = new ReviewerAttributes();
      }
      this.reviewerAttributes.severity = 5; // default
      this.reviewerAttributes.lifecycleStatus = 1; // default
	},

    setLoggedInuser: function(username) {
      this.reportedByNode.value = username;
      this.reportedByNode.disabled = true;
    },


     // On click of button set ReviewerAttribute properties
    // and dispatch reportButtonClicked event
    _onFormSubmit: function() {
      //if (this.isFormValid()) {
		this.reviewerAttributes.reviewTechnician = this.reportedByNode.value;
        this.reviewerAttributes.notes = this.notesNode.value;
        this.reviewerAttributes.reviewStatus = this.statusNode.value;
        this.reviewerAttributes.severity = this.severityNode.value;
		this.reviewerAttributes.resourceName = this.layerNode.value;
        this.emit('ReportSubmit', {}, [this.reviewerAttributes]);
      //}
    },
	
	_onCancel : function () {
		this.emit('ReportCancel', {}, []);
	},

    // make sure user supplied all required inputs
    // highlight invalid fields
    isFormValid: function() {
      var profile = {
        trim: [ 'notes', 'reviewTechnician' ],
        required: [ 'reviewStatus' ]
      };
      var results, hasMissing;
      if (this.includeReportedBy) {
        profile.required.push('reviewTechnician');
      }
      results = validate.check(this.formNode, profile);
      hasMissing = results.hasMissing();
    }
  });
});