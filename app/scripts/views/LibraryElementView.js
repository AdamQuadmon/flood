define(['backbone'], function(Backbone) {

  return Backbone.View.extend({

    tagName: 'li',
    className: 'search-element',

    template: _.template( $('#library-element-template').html() ),

    events: {
      'click':  'click'
    },

    render: function() {

      this.$el.html( this.template( this.model.toJSON() ) );

    },

    click: function(e) {

      this.model.app.addNodeToWorkspace( this.model.get('name') );

    }

  });

});