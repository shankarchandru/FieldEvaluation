define([
	"dojo/_base/declare",
	"dojo/query",
	"dijit/TitlePane",
	"dojo/Evented"
	], 
	function(declare, query, TitlePane, Evented) {
		return declare([TitlePane, Evented], {
			childWidgetId: null,
			
			constructor: function(options) {
				this.inherited(arguments);
			},
			
			toggle: function() {
				this.inherited(arguments);
				
				if(this.childWidget && this.childWidget.resize)
                    this.childWidget.resize();

				var eventArguments = {
					opening: this.open
				};
				this.emit("onToggle", eventArguments);

				/*var childWidgets = dojo.query("[widgetid]", this.domNode).map(dijit.byNode).filter(function(wid){ 
					return wid;
				}) //filter invalid widget ids that yielded undefined
				
				if(null != childWidgets) {
					for(var i = 0; i < childWidgets.length; i++)
						childWidgets[i].resize();
				}*/
			}
		});
	}
);
	