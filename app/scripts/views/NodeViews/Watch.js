define(['backbone', 'underscore', 'jquery', 'BaseNodeView'], function(Backbone, _, $, BaseNodeView) {

  return BaseNodeView.extend({

    template: _.template( $('#node-watch-template').html() ),

    initialize: function(args) {

      BaseNodeView.prototype.initialize.apply(this, arguments);
      this.model.on( 'change:lastValue', this.renderNode, this );
      this.model.on('disconnection', this.renderNode, this);

    },

    renderNode: function(){

    	var pretty = this.model.get('lastValue') != undefined ? JSON.stringify(this.model.get('lastValue'), this.prettyPrint, 2) : this.model.get('lastValue');
    	this.model.set('prettyValue', pretty );

    	return BaseNodeView.prototype.renderNode.apply(this, arguments);

    },

    prettyPrint: function(key, val){
    	if (typeof val === "number"){
    		return val.toPrecision(4);
    	}
    	return val;
    }

  });

});
