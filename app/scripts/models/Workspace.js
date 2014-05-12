define(['backbone', 'Nodes', 'Connection', 'Connections', 'scheme', 'FLOOD', 'Runner'], 
    function(Backbone, Nodes, Connection, Connections, scheme, FLOOD, Runner) {

  return Backbone.Model.extend({

    idAttribute: "_id",

    defaults: {
      name: "Unnamed Workspace",
      nodes: null,
      connections: null,
      zoom: 1,
      current: false,
      isPublic: false,
      isRunning: false,
      lastSaved: Date.now()
    },

    draggingProxy: false,
    proxyConnection: null,
    runAllowed: false,

    toJSON : function() {

        if (this._isSerializing) {
            return this.id || this.cid;
        }

        this._isSerializing = true;

        var json = _.clone(this.attributes);

        _.each(json, function(value, name) {
            _.isFunction(value.toJSON) && (json[name] = value.toJSON());
        });

        this._isSerializing = false;

        return json;
    },

    initialize: function(atts, arr) {

      atts = atts || {};

      this.app = arr.app;

      this.set('nodes', new Nodes( atts.nodes, { workspace: this }) );
      this.set('connections', new Connections( atts.connections, { workspace: this}) );

      // tell all nodes about connections
      _.each( this.get('connections').where({startProxy: false, endProxy: false}), function(ele, i) {
        this.get('nodes').get(ele.get('startNodeId')).connectPort( ele.get('startPortIndex'), true, ele);
        this.get('nodes').get(ele.get('endNodeId')).connectPort(ele.get('endPortIndex'), false, ele);
      }, this);

      this.runner = new Runner({id : this.get('_id') }, { workspace: this });

      // updates to connections and nodes are emitted to listeners
      var that = this;
      this.runner.on('change:isRunning', function(v){
        that.set('isRunning', v.get('isRunning'));
      });

      this.get('connections').on('add remove', function(){ 
        that.trigger('change:connections'); 
        that.run();
      });

      this.get('nodes').on('add remove', function(){ 
        that.trigger('change:nodes'); 
        that.run();
      });

      this.proxyConnection = new Connection({
        _id: -1, 
        startProxy: true, 
        endProxy: true, 
        startProxyPosition: [0,0], 
        endProxyPosition: [0,0],
        hidden: true }, 
      {workspace: this});

      this.runAllowed = true;

      // run the workspace for the first time
      this.run();

    },

    parse : function(resp) {
      resp.nodes = new Nodes( resp.nodes );
      resp.connections = new Connections( resp.connections )
      return resp;
    },

    printModel: function(){
      console.log(this.toJSON());
    },


    removeSelectedNodes: function(){

      var that = this;
      var toDelete = [];

      this.get('nodes')
          .each(function(x){ 
            if ( x.get('selected') ){
              console.log('to delete')
              toDelete.push(x);
            }
          });

      this.get('nodes').remove(toDelete);

    },

    run: function() {

      if (!this.runAllowed || this.get('nodes').length === 0)
        return;

      var bottomNodes = this.get('nodes')
                            .filter(function(ele){
                              return ele.isOutputNode();
                            }).map(function(ele){
                              return ele.get('_id');
                            });

      this.runner.run( bottomNodes );

    },

    startProxyConnection: function(startNodeId, nodePort, startPosition) {

      // set the initial properties for a dragging proxy
      this.proxyConnection.set('hidden', false);
      this.proxyConnection.set('startNodeId', startNodeId);
      this.proxyConnection.set('startPortIndex', nodePort );

      this.proxyConnection.set('startProxy', false );

      this.proxyConnection.set('endProxy', true );
      this.proxyConnection.set('endProxyPosition', startPosition);

      this.draggingProxy = true;

      this.trigger('startProxyDrag');
      return this;
    },

    completeProxyConnection: function(endNode, endPort) {

      this.draggingProxy = false;
      this.trigger('endProxyDrag');

      // this is where we started drawing the connection
      var startNodeId = this.proxyConnection.get('startNodeId')
        , startPort = this.proxyConnection.get('startPortIndex');

      this.makeConnection(startNodeId, startPort, endNode, endPort);
      
      return this;
    },

    endProxyConnection: function() {
      this.proxyConnection.set('hidden', true);
      this.draggingProxy = false;
      return this;
    },

    makeNode : function(type, name, position) {
      var node = new Node({name: name, type: type, position: position})
      this.get('nodes').add( node );
      return this;
    },

    removeConnection : function(connection){
      this.get('connections').remove(connection);
    },

    makeConnection : function(startNodeId, startPort, endNodeId, endPort) {
      
      if (!this.validateConnection(startNodeId, startPort, endNodeId, endPort)){
        return;
      }

      // one could perform a type comparison here
      
      var newCon = new Connection({
          startNodeId: startNodeId,
          startPortIndex: startPort,
          endNodeId: endNodeId,
          endPortIndex: endPort,
          _id: this.app.makeId()
        }, {workspace: this});

      // update the start and end nodes
      this.get('connections').add(newCon);

      this.get('nodes').get(newCon.get('startNodeId')).connectPort( newCon.get('startPortIndex'), true, newCon);
      this.get('nodes').get(newCon.get('endNodeId')).connectPort(newCon.get('endPortIndex'), false, newCon);

      return this;
    },

    validateConnection: function(startNodeId, startPort, endNodeId, endPort) {

      var startNode = this.get('nodes').get(startNodeId)
        , endNode = this.get('nodes').get(endNodeId);

      if (endNode.isPortConnected(endPort, false))
        return false;

      return true;

    }

  });

});



