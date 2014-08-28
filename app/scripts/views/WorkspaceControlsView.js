define(['backbone', 'List', 'SearchElementView', 'bootstrap'], function(Backbone, List, SearchElementView, bootstrap) {

  return Backbone.View.extend({

    tagName: 'div',
    className: 'workspace-search',

    initialize: function(atts, arr) {
      this.app = arr.app;
      this.appView = arr.appView;

      this.app.SearchElements.on('add remove', this.render, this);
    },

    template: _.template( $('#workspace-search-template').html() ),

    events: {
      'keyup .library-search-input': 'searchKeyup',
      'focus .library-search-input': 'focus',
      'blur .library-search-input': 'blur',
      'click #delete-button': 'deleteClick',
      'click #undo-button': 'undoClick',
      'click #redo-button': 'redoClick',
      'click #copy-button': 'copyClick',
      'click #paste-button': 'pasteClick',
      'click #zoomin-button': 'zoominClick',
      'click #zoomout-button': 'zoomoutClick',
      'click #zoomreset-button': 'zoomresetClick',
      'click #export-button': 'exportClick'
    },

    render: function(arg) {

      this.$el.html( this.template( this.model.toJSON() ) );

      this.$input = this.$('.library-search-input');
      this.$list = this.$('.search-list');

      // highlight text in the search input when focussed
      this.$input.focus(function(){ this.select(); });

      this.$list.empty();

      var that = this;

      this.app.SearchElements.forEach(function(ele) {

        var eleView = new SearchElementView({ model: ele }, { appView: that.appView, app: that.app, 
          click: function(e){ that.elementClick.call(that, e); } });

        eleView.render();
        that.$list.append( eleView.$el );

      });

      var options = {
          valueNames: [ 'name' ]
      };

      this.list = new List(this.el, options);

      // build button tooltips
      this.$el.find('#undo-button').tooltip({title: "Undo"});
      this.$el.find('#redo-button').tooltip({title: "Redo"});

      this.$el.find('#copy-button').tooltip({title: "Copy"});
      this.$el.find('#paste-button').tooltip({title: "Paste"});

      this.$el.find('#delete-button').tooltip({title: "Delete"});

      this.$el.find('#zoomin-button').tooltip({title: "Zoom in"});
      this.$el.find('#zoomout-button').tooltip({title: "Zoom out"});
      this.$el.find('#zoomreset-button').tooltip({title: "Zoom reset"});

      this.$el.find('#export-button').tooltip({title: "Export as STL"});

      this.$('#workspace_hide').tooltip({title: "Switch between 3D view and nodes"});

    },

    focus: function(event){
      this.$('.search-list').show();
      this.$('.library-search-input').select();
    },

    blur: function(event){
      var that = this;
      window.setTimeout(function(){
        that.$('.search-list').hide();
      }, 100);
    },

    currentWorkspace: function(){
      return this.app.get('workspaces').get( this.app.get('currentWorkspace') );
    },

    deleteClick: function(){
      this.currentWorkspace().removeSelected();
    },

    copyClick: function(){
      this.currentWorkspace().copy();
    },

    pasteClick: function(){
      this.currentWorkspace().paste();
    },

    undoClick: function(){
      this.currentWorkspace().undo();
    },

    redoClick: function(){
      this.currentWorkspace().redo();
    },

    zoomresetClick: function(){
      this.currentWorkspace().set('zoom', 1.0);
    },

    zoominClick: function(){
      this.currentWorkspace().zoomIn();
    },

    zoomoutClick: function(){
      this.currentWorkspace().zoomOut();
    },

    getWorkspaceCenter: function(){

      var w = this.appView.currentWorkspaceView.$el.width()
        , h = this.appView.currentWorkspaceView.$el.height()
        , ho = this.appView.currentWorkspaceView.$el.scrollTop()
        , wo = this.appView.currentWorkspaceView.$el.scrollLeft()
        , zoom = 1 / this.currentWorkspace().get('zoom');

      return [zoom * (wo + w / 2), zoom * (ho + h / 2)];
    },

    addNode: function(name){

      if (name === undefined ) return;

      this.currentWorkspace().addNodeByNameAndPosition( name, this.getWorkspaceCenter() );

    },

    objConverter: function(x, vertexOffset, index){

        if ( !x || !( x.vertices && x.faces ) ) return "";

        var text = "";

        // OBJ used 1-based indexing
        vertexOffset = vertexOffset + 1;

        x.vertices.forEach(function(v){

          text += "v"
          text += " " + v[0];
          text += " " + v[1];
          text += " " + v[2];
          text += "\n";

        });

        x.faces.forEach(function(f){
          
          text += "f"
          text += " " + (vertexOffset + f[0]);
          text += " " + (vertexOffset + f[1]);
          text += " " + (vertexOffset + f[2]);
          text += "\n";

        });

        return text;
    },

    stlConverter: function(x, vertexOffset, index){

        if ( !x || !( x.vertices && x.faces ) ) return "";

        var text = "solid s" + index + "\n";

        x.faces.forEach(function(f){
          
          var v1 = x.vertices[ f[0] ];
          var v2 = x.vertices[ f[1] ];
          var v3 = x.vertices[ f[2] ];
          var n = f[3];

          text += "facet normal"
          text += " " + n[0];
          text += " " + n[1];
          text += " " + n[2];
          text += "\n";

            text += "\touter loop\n";

              text += "\t\tvertex"
              text += " " + v1[0];
              text += " " + v1[1];
              text += " " + v1[2];
              text += "\n";

              text += "\t\tvertex"
              text += " " + v2[0];
              text += " " + v2[1];
              text += " " + v2[2];
              text += "\n";

              text += "\t\tvertex"
              text += " " + v3[0];
              text += " " + v3[1];
              text += " " + v3[2];
              text += "\n";

            text += "\tendloop\n";

          text += "\tendfacet\n";

        });

        text += "endsolid\n";

        return text;
    },

    exportClick: function(e){

      var res = this.getFileFromSelected( this.stlConverter );

      var wsName = this.currentWorkspace().get('name');

      this.download(wsName + ".stl", res);

    },

    getFileFromSelected: function(converterFunc){

      var ws = this.currentWorkspace();

      var text = "";
      var vertexOffset = 0;

      return ws.get('nodes')
        .filter(function(x){ return x.get('selected'); })
        .map(function(x){ return x.get('prettyLastValue'); })
        .flatten()
        .reduce(function(a, x, i){

          var t = converterFunc(x, vertexOffset, i) || "";

          if ( x && x.vertices && x.vertices.length != undefined) 
            vertexOffset += x.vertices.length;

          return a + t;

        }, text);

    },

    download: function(filename, text) {
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);
        pom.click();
    },

    elementClick: function(ele){

      this.addNode( ele.model.get('name') );

    },

    searchKeyup: function(event) {

      // enter key causes first result to be inserted
      if ( event.keyCode === 13) {

        var nodeName = this.$list.find('.search-element').first().find('.name').first().html();
        if (nodeName === undefined ) return;

        this.addNode( nodeName );

      } 

    } 

  });

});

