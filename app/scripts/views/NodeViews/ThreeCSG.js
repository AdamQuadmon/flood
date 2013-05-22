define(['backbone', 'underscore', 'jquery', 'BaseNodeView'], function(Backbone, _, $, BaseNodeView) {

  return BaseNodeView.extend({

    initialize: function(args) {

      BaseNodeView.prototype.initialize.apply(this, arguments);

      this.model.on('change:selected', this.onSelect, this);
      this.model.on('change:visible', this.onVisibilityChanged, this);
      this.model.on('remove', this.onRemove, this);
      this.model.on('change:lastValue', this.evalCompleted, this );
      this.model.workspace.on('change:current', this.onVisibilityChanged, this);

      // the node view is created after the eval
      this.evalCompleted();

    },

    // 3D move to node subclass
    onSelect: function(){

      if ( this.threeGeom && this.model.get('visible') ){

        if (this.model.get('selected')) {
          this.threeGeom.traverse(function(ele) {
            ele.material = new THREE.MeshPhongMaterial({color: 0x00FFFF, specular: 0xFFFFFF, opacity: 0.7, transparent: true});
          });
        } else {
          this.threeGeom.traverse(function(ele) {
            ele.material = new THREE.MeshPhongMaterial({color: 0xDDDDDD, specular: 0xFFFFFF, opacity: 0.7, transparent: true});
          });
        }

      }

    }, 

    // 3D move to node subclass
    onRemove: function(){
      this.model.workspace.off('change:current', this.onVisibilityChanged, this);
      scene.remove(this.threeGeom); 
    }, 

    evalCompleted: function(){

      var lastValue = this.model.get('lastValue');
      var temp;


      if ( !lastValue )
        return;

      if ( lastValue.polygons ){ 
        temp = [];
        temp.push(lastValue);
      } else {
        temp = lastValue.List; // extract the list
      } 

      if ( this.threeGeom ){
        scene.remove(this.threeGeom);
      }

      this.threeGeom = new THREE.Object3D();

      var that = this;

      temp.map(function(ele){

        var g3  = THREE.CSG.fromCSG( ele );
        
        if (that.model.get('selected')){
          var color = 0x00FFFF;
        } else {
          var color = 0xDDDDDD;
        }

        var mesh = new THREE.Mesh(g3, new THREE.MeshPhongMaterial({color: color, specular: 0xFFFFFF, opacity: 0.7, transparent: true}));
        that.threeGeom.add( mesh );

      });

      this.onVisibilityChanged();

    }, 

    onVisibilityChanged: function(){

      if ( !this.threeGeom ){
        return
      }
        
      if (!this.model.get('visible') || !this.model.workspace.get('current') )
      {
        console.log('remove geometry')
        scene.remove(this.threeGeom);
      } else if ( this.model.get('visible') )
      {
        scene.add(this.threeGeom);
      }

    },

    render: function() {

      BaseNodeView.prototype.render.apply(this, arguments);

      this.$toggleVis = this.$el.find('.toggle-vis');
      this.$toggleVis.show();

      if (this.model.get('visible')){
        this.$toggleVis.find('img').attr('src', 'images/vis_off.png');
        this.$toggleVis.attr('title', 'Hide geometry');
      } else {
        this.$toggleVis.find('img').attr('src', 'images/toggle_vis.png');
        this.$toggleVis.attr('title', 'Show geometry');
      }

      return this;

    },

  });

});