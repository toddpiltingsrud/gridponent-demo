// gridponent.js
// version : 0.1-beta
// author : Todd Piltingsrud
// license : MIT
/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    'use strict';

    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if ( elem instanceof HTMLElement ) {
        var tblContainer = elem.querySelector( '.table-container' );
        // has this already been initialized?
        if ( tblContainer && tblContainer.api ) return tblContainer.api;

        if ( options ) {
            var init = new gridponent.Initializer( elem );
            var config = init.initializeOptions( options );
            return config.node.api;
        }
    }

    var obj = {
        api: null,
        callback: function () { },
        ready: function ( callback ) {
            if ( obj.api ) {
                obj.api.ready( callback );
            }
            else obj.callback = callback;
        }
    };

    gridponent.ready( function () {
        // check for a selector
        if ( typeof elem == 'string' ) {
            elem = document.querySelector( elem );
        }
        if ( elem instanceof HTMLElement ) {
            var tblContainer = elem.querySelector( '.table-container' );
            // has this already been initialized?
            if ( tblContainer && tblContainer.api ) {
                if ( obj.callback ) {
                    tblContainer.api.ready( obj.callback );
                }
                else {
                    obj.api = tblContainer.api;
                }
            }

            if ( options ) {
                var init = new gridponent.Initializer( elem );
                var config = init.initializeOptions( options );
                if ( obj.callback ) {
                    config.node.api.ready( obj.callback );
                }
                else {
                    obj.api = config.node.api;
                }
            }
        }
    } );

    return obj;

};

( function ( gp ) {
    'use strict';
    /***************\
          API
    \***************/

    gp.events = {

        rowSelected: 'rowselected',
        beforeInit: 'beforeinit',
        // turn progress indicator on
        beforeRead: 'beforeread',
        // turn progress indicator on
        beforeEdit: 'beforeedit',
        // turn progress indicator off
        onRead: 'onread',
        // turn progress indicator off
        // raised after create, update and delete
        onEdit: 'onedit',
        // gives external code the opportunity to initialize UI elements (e.g. datepickers)
        editReady: 'editready',
        // turn progress indicator off
        httpError: 'httpError',
        // happens once after the grid is fully initialized and databound
        ready: 'ready'
    };


    gp.api = function ( controller ) {
        this.controller = controller;
        this.config = controller.config;
        this.$n = $( this.config.node );
    };

    gp.api.prototype = {

        create: function ( dataItem ) {
            this.controller.addRow( dataItem );
            return this;
        },

        destroy: function ( dataItem, callback ) {
            this.controller.deleteRow( dataItem, callback, true );
            return this;
        },

        dispose: function () {
            this.controller.dispose();
            return this;
        },

        find: function ( selector ) {
            // include this.$n via addBack
            return this.$n.find( selector ).addBack( selector );
        },

        getData: function ( uidOrTableRow ) {
            if ( uidOrTableRow != undefined ) return this.config.map.get( uidOrTableRow );
            return this.controller.config.pageModel.data;
        },

        getTableRow: function ( dataItem ) {
            return gp.getTableRow(
                this.controller.config.map,
                dataItem,
                this.controller.config.node
            );
        },

        read: function ( requestModel, callback ) {
            this.controller.read( requestModel, callback );
            return this;
        },

        refresh: function ( callback ) {
            this.controller.read( null, callback );
            return this;
        },

        saveChanges: function ( dataItem, done ) {
            this.controller.updateRow( dataItem, done );
            return this;
        },

        search: function ( searchTerm, callback ) {
            // make sure we pass in a string
            searchTerm = gp.isNullOrEmpty( searchTerm ) ? '' : searchTerm.toString();
            this.controller.search( searchTerm, callback );
            return this;
        },

        sort: function ( name, desc, callback ) {
            // validate the args
            name = gp.isNullOrEmpty( name ) ? '' : name.toString();
            typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
            this.controller.sort( name, desc, callback );
            return this;
        },

        toggleBusy: function ( isBusy ) {

            isBusy = ( isBusy === true || isBusy === false ? isBusy : !gp.hasClass( this.config.node, 'busy' ) );

            if ( isBusy ) {
                this.$n.addClass( 'busy' );
            }
            else {
                this.$n.removeClass( 'busy' );
            }

            return this;
        }

    };

    Object.getOwnPropertyNames( gp.events ).forEach( function ( evt ) {

        gp.api.prototype[evt] = function ( callback ) {
            if ( typeof callback === 'function' ) {
                this.controller.addDelegate( gp.events[evt], callback );
            }
            return this;
        };

    } );

    gp.api.prototype.ready = function ( callback ) {
        this.controller.ready( callback );
        return this;
    };

    gp.api.prototype.rowSelected = function ( callback ) {
        if ( typeof callback === 'function' ) {
            this.controller.addDelegate( gp.events.rowSelected, callback );
            this.$n.addClass( 'selectable' );
        }
        return this;
    };
    /***************\
       controller
    \***************/
    gp.Controller = function ( config, model, requestModel, injector ) {
        this.config = config;
        this.model = model;
        this.$n = $( config.node );
        this.requestModel = requestModel;
        this.injector = injector;
        if ( config.pager ) {
            this.requestModel.top = 25;
        }
        this.handlers = {
            readHandler: this.read.bind( this ),
            commandHandler: this.commandHandler.bind( this ),
            rowSelectHandler: this.rowSelectHandler.bind( this ),
            httpErrorHandler: this.httpErrorHandler.bind( this ),
            toolbarChangeHandler: this.toolbarChangeHandler.bind( this ),
            toolbarEnterKeyHandler: this.toolbarEnterKeyHandler.bind( this )
        };
        this.done = false;
        this.eventDelegates = {};
        this.addBusyDelegates();
    };

    gp.Controller.prototype = {

        init: function () {
            var self = this;
            this.addCommandHandlers( this.config.node );
            this.addRowSelectHandler( this.config );
            this.addRefreshEventHandler( this.config );
            this.addToolbarChangeHandler();
            this.done = true;
            this.invokeDelegates( gp.events.ready, this.config.node.api );
        },

        addBusyDelegates: function () {
            this.addDelegate( gp.events.beforeRead, this.addBusy );
            this.addDelegate( gp.events.onRead, this.removeBusy );
            this.addDelegate( gp.events.beforeEdit, this.addBusy );
            this.addDelegate( gp.events.onEdit, this.removeBusy );
            this.addDelegate( gp.events.httpError, this.removeBusy );
        },

        addBusy: function () {
            // this function executes with the api as its context
            this.$n.addClass( 'busy' );
        },

        removeBusy: function () {
            // this function executes with the api as its context
            this.$n.removeClass( 'busy' );
        },

        ready: function ( callback ) {
            if ( this.done ) {
                gp.applyFunc( callback, this.config.node.api, this.config.node.api );
            }
            else {
                this.addDelegate( gp.events.ready, callback );
            }
        },

        addDelegate: function ( event, delegate ) {
            this.eventDelegates[event] = this.eventDelegates[event] || [];
            this.eventDelegates[event].push( delegate );
        },

        invokeDelegates: function ( event, args ) {
            var self = this,
                proceed = true,
                delegates = this.eventDelegates[event];
            if ( Array.isArray( delegates ) ) {
                delegates.forEach( function ( delegate ) {
                    if ( proceed === false ) return;
                    proceed = gp.applyFunc( delegate, self.config.node.api, args );
                } );
            }
            return proceed;
        },

        addToolbarChangeHandler: function () {
            // monitor changes to search, sort, and paging
            var selector = '.table-toolbar [name], thead input, .table-pager input';
            this.$n.on( 'change', selector, this.handlers.toolbarChangeHandler );
            this.$n.on( 'keydown', selector, this.handlers.toolbarEnterKeyHandler );
        },

        removeToolbarChangeHandler: function () {
            this.$n.off( 'change', this.handlers.toolbarChangeHandler );
            this.$n.off( 'keydown', this.handlers.toolbarEnterKeyHandler );
        },

        toolbarEnterKeyHandler: function ( evt ) {
            // tracks the search and paging textboxes
            if ( evt.keyCode == 13 ) {
                // trigger change event
                evt.target.blur();
                return;
            }
        },

        toolbarChangeHandler: function ( evt ) {
            // tracks the search and paging textboxes
            var name = evt.target.name,
                model = this.config.pageModel,
                type = gp.getType( model[name] ),
                val = gp.ModelSync.cast( evt.target.value, type );

            model[name] = val;

            this.read();
        },

        addCommandHandlers: function ( node ) {
            // listen for command button clicks at the grid level
            $( node ).on( 'click', 'button[value],a[value]', this.handlers.commandHandler );
        },

        removeCommandHandlers: function ( node ) {
            $( node ).off( 'click', this.handlers.commandHandler );
        },

        commandHandler: function ( evt ) {
            // this function handles all the button clicks for the entire grid
            var lower,
                $btn = $( evt.currentTarget ),
                rowOrModal = $btn.closest( 'tr[data-uid],div.modal', this.config.node ),
                dataItem = rowOrModal.length ? this.config.map.get( rowOrModal[0] ) : null,
                value = $btn.attr( 'value' ),
                cmd = gp.getCommand( this.config.columns, value ),
                model = this.config.pageModel;

            // check for a user-defined command
            if ( cmd && typeof cmd.func === 'function' ) {
                cmd.func.call( this.config.node.api, dataItem );
                return;
            };

            lower = ( value || '' ).toLowerCase();

            switch ( lower ) {
                case 'addrow':
                    this.addRow();
                    break;
                case 'edit':
                    // the button is inside either a table row or a modal
                    this.editRow( dataItem, rowOrModal );
                    break;
                case 'delete':
                case 'destroy':
                    this.deleteRow( dataItem, rowOrModal );
                    break;
                case 'page':
                    var page = $btn.attr( 'data-page' );
                    model.page = parseInt( page );
                    this.read();
                    break;
                case 'search':
                    model.search = this.$n.find( '.table-toolbar input[name=search]' ).val();
                    this.read();
                    break;
                case 'sort':
                    var sort = $btn.attr( 'data-sort' );
                    if ( model.sort === sort ) {
                        model.desc = !model.desc;
                    }
                    else {
                        model.sort = sort;
                        model.desc = false;
                    }
                    this.read();
                    break;
                default:
                    // check for a function
                    // this is needed in case there's a custom command in the toolbar
                    cmd = gp.getObjectAtPath( $btn.val() );
                    if ( typeof cmd == 'function' ) {
                        cmd.call( this.config.node.api, dataItem );
                    }
                    break;
            }
        },

        getEditor: function ( mode ) {
            var self = this, editor;

            if ( mode == undefined ) {
                editor = new gp.Editor( this.config, this.model, this.injector );
            }
            else if ( mode == 'modal' ) {
                editor = new gp.ModalEditor( this.config, this.model, this.injector );
            }
            else {
                editor = new gp.TableRowEditor( this.config, this.model, this.injector );
            }

            editor.beforeEdit = function ( model ) {
                self.invokeDelegates( gp.events.beforeEdit, model );
            };

            editor.afterEdit = function ( model ) {
                self.invokeDelegates( gp.events.onEdit, model );
            };

            editor.editReady = function ( model ) {
                self.invokeDelegates( gp.events.editReady, model );
            };

            return editor;
        },

        addRowSelectHandler: function ( config ) {
            // always add click handler so we can call api.rowSelected after grid is initialized
            this.$n.on( 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
        },

        removeRowSelectHandler: function () {
            this.$n.off( 'click', this.handlers.rowSelectHandler );
        },

        rowSelectHandler: function ( evt ) {
            var config = this.config,
                tr = $( evt.target ).closest( 'tr', config.node ),
                trs = this.$n.find( 'div.table-body > table > tbody > tr.selected' ),
                type = typeof config.rowselected,
                dataItem,
                proceed;

            if ( type === 'string' && config.rowselected.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

            trs.removeClass( 'selected' );

            // add selected class
            $( tr ).addClass( 'selected' );
            // get the dataItem for this tr
            dataItem = config.map.get( tr );

            proceed = this.invokeDelegates( gp.events.rowSelected, dataItem );

            if ( proceed === false ) return;

            if ( type === 'urlTemplate' ) {
                window.location = gp.supplant.call( this.config.node.api, config.rowselected, dataItem );
            }
        },

        addRefreshEventHandler: function ( config ) {
            if ( config.refreshevent ) {
                $( document ).on( config.refreshevent, this.handlers.readHandler );
            }
        },

        removeRefreshEventHandler: function ( config ) {
            if ( config.refreshevent ) {
                $( document ).off( config.refreshevent, this.handlers.readHandler );
            }
        },

        search: function ( searchTerm, callback ) {
            this.config.pageModel.search = searchTerm;
            this.$n.find( 'div.table-toolbar input[name=search]' ).val( searchTerm );
            this.read( null, callback );
        },

        sort: function ( field, desc, callback ) {
            this.config.pageModel.sort = field;
            this.config.pageModel.desc = ( desc == true );
            this.read( null, callback );
        },

        read: function ( requestModel, callback ) {
            var self = this, proceed = true;
            if ( requestModel ) {
                gp.shallowCopy( requestModel, this.config.pageModel );
            }
            proceed = this.invokeDelegates( gp.events.beforeRead, this.config.node.api );
            if ( proceed === false ) return;
            this.model.read( this.config.pageModel, function ( model ) {
                try {
                    // standardize capitalization of incoming data
                    gp.shallowCopy( model, self.config.pageModel, true );
                    self.injector.setResource( '$data', self.config.pageModel.data );
                    self.config.map.clear();
                    gp.resolveTypes( self.config );
                    self.refresh( self.config );
                    self.invokeDelegates( gp.events.onRead, self.config.node.api );
                    gp.applyFunc( callback, self.config.node, self.config.pageModel );
                } catch ( e ) {
                    self.removeBusy();
                    self.httpErrorHandler( e );
                }
            }, this.handlers.httpErrorHandler );
        },

        addRow: function ( dataItem ) {

            var editor = this.getEditor( this.config.editmode );

            var model = editor.add( dataItem );

            return editor;
        },

        editRow: function ( dataItem, elem ) {

            var editor = this.getEditor( this.config.editmode );

            var model = editor.edit( dataItem, elem );

            return editor;
        },

        updateRow: function ( dataItem, callback ) {

            try {
                var self = this,
                    editor = this.getEditor();

                // if there is no update configuration setting, we're done here
                if ( !gp.hasValue( this.config.update ) ) {
                    gp.applyFunc( callback, self.config.node );
                    return;
                }

                editor.edit( dataItem );

                editor.save( callback, this.httpErrorHandler.bind( this ) );
            }
            catch ( e ) {
                this.removeBusy();
                this.httpErrorHandler( e );
            }
        },

        // we don't require a tr parameter because it may not be in the grid
        deleteRow: function ( dataItem, callback, skipConfirm ) {
            try {
                if ( !gp.hasValue( this.config.destroy ) ) {
                    gp.applyFunc( callback, this.config.node );
                    return;
                }

                var self = this,
                    confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                    message,
                    tr = gp.getTableRow( this.config.map, dataItem, this.$n[0] );

                if ( !confirmed ) {
                    gp.applyFunc( callback, this.config.node );
                    return;
                }

                this.invokeDelegates( gp.events.beforeEdit, {
                    type: 'destroy',
                    dataItem: dataItem,
                    elem: tr
                } );

                this.model.destroy( dataItem, function ( response ) {

                    try {
                        if ( !response || !response.errors ) {
                            // if it didn't error out, we'll assume it succeeded
                            // remove the dataItem from the model
                            var index = self.config.pageModel.data.indexOf( dataItem );
                            if ( index != -1 ) {
                                self.config.pageModel.data.splice( index, 1 );
                            }
                            self.refresh( self.config );
                        }
                    }
                    catch ( err ) {
                        gp.error( err );
                    }

                    self.invokeDelegates( gp.events.onEdit, {
                        type: 'destroy',
                        dataItem: dataItem,
                        elem: tr
                    } );

                    gp.applyFunc( callback, self.config.node.api, response );
                },
                self.handlers.httpErrorHandler );
            }
            catch ( e ) {
                this.removeBusy();
                this.httpErrorHandler( e );
            }
        },

        refresh: function () {
            try {
                // inject table rows, footer, pager and header style.
                var body = this.$n.find( 'div.table-body' ),
                    footer = this.$n.find( 'div.table-footer' ),
                    pager = this.$n.find( 'div.table-pager' );

                this.config.map.clear();

                body.html( this.injector.exec( 'tableBody' ) );
                // if we're not using fixed footers this will have no effect
                footer.html( this.injector.exec( 'footerTable' ) );
                pager.html( this.injector.exec( 'pagerBar' ) );

                gp.helpers.sortStyle( this.config );
            }
            catch ( e ) {
                gp.error( e );
            }
        },

        httpErrorHandler: function ( e ) {
            this.invokeDelegates( gp.events.httpError, e );
            alert( 'An error occurred while carrying out your request.' );
            gp.error( e );
        },

        dispose: function () {
            this.removeRefreshEventHandler( this.config );
            this.removeRowSelectHandler();
            this.removeCommandHandlers( this.config.node );
            this.removeToolbarChangeHandler();
        }

    };
    /***************\
       DataLayer
    \***************/
    gp.DataLayer = function ( config ) {
        this.config = config;
        this.reader = null;
    };

    gp.DataLayer.prototype = {
        getReader: function () {
            var type = gp.getType( this.config.read );
            switch ( type ) {
                case 'string':
                    return new gp.ServerPager( this.config.read );
                    break;
                case 'function':
                    return new gp.FunctionPager( this.config );
                    break;
                case 'object':
                    // read is a PagingModel
                    this.config.pageModel = this.config.read;
                    return new gp.ClientPager( this.config );
                    break;
                case 'array':
                    this.config.pageModel.data = this.config.read;
                    return new gp.ClientPager( this.config );
                    break;
                default:
                    throw 'Unsupported read configuration';
            }
        },
        read: function ( requestModel, done, fail ) {
            var self = this;

            if ( !this.reader ) {
                this.reader = this.getReader();
            }

            this.reader.read(
                requestModel,
                // make sure we wrap result in an array when we return it
                // if result is an array of data, then applyFunc will end up only grabbing the first dataItem
                function ( result ) {
                    result = self.resolveResult( result );
                    gp.applyFunc( done, self, [result] );
                },
                function ( result ) { gp.applyFunc( fail, self, [result] ); }
            );
        },

        create: function ( dataItem, done, fail ) {
            var self = this, url;

            // config.create can be a function or a URL
            if ( typeof this.config.create === 'function' ) {
                // call the function, set the API as the context
                gp.applyFunc( this.config.create, this.config.node.api, [dataItem, done, fail], fail );
            }
            else {
                // the url can be a template
                url = gp.supplant( this.config.create, dataItem );
                // call the URL
                var http = new gp.Http();
                http.post(
                    url,
                    dataItem,
                    function ( arg ) { gp.applyFunc( done, self, arg ); },
                    function ( arg ) { gp.applyFunc( fail, self, arg ); }
                );
            }
        },

        update: function ( dataItem, done, fail ) {
            var self = this, url;

            // config.update can be a function or URL
            if ( typeof this.config.update === 'function' ) {
                gp.applyFunc( this.config.update, this.config.node.api, [dataItem, done, fail], fail );
            }
            else {
                // the url can be a template
                url = gp.supplant( this.config.update, dataItem );
                var http = new gp.Http();
                http.post(
                    url,
                    dataItem,
                    function ( arg ) { gp.applyFunc( done, self, arg ); },
                    function ( arg ) { gp.applyFunc( fail, self, arg ); }
                );
            }
        },

        destroy: function ( dataItem, done, fail ) {
            var self = this, url;
            if ( typeof this.config.destroy === 'function' ) {
                gp.applyFunc( this.config.destroy, this.config.node.api, [dataItem, done, fail], fail );
            }
            else {
                // the url can be a template
                url = gp.supplant( this.config.destroy, dataItem );
                var http = new gp.Http();
                http.destroy(
                    url,
                    function ( arg ) { gp.applyFunc( done, self, arg ); },
                    function ( arg ) { gp.applyFunc( fail, self, arg ); }
                );
            }
        },

        resolveResult: function ( result ) {
            if ( gp.hasValue( result ) && Array.isArray( result ) ) {
                //  wrap the array in a PagingModel
                return new gp.PagingModel( result );
            }
            return result;
        }


    };
    /***************\
        datamap
    \***************/
    gp.DataMap = function () {

        this.uid = 0;
        this.map = {};

    };

    gp.DataMap.prototype = {

        assign: function ( dataItem, elem ) {
            var i = ++this.uid;

            this.map[i] = dataItem;

            if ( elem && elem.setAttribute ) {
                elem.setAttribute( 'data-uid', i.toString() );
            }

            return i;
        },

        get: function ( uidOrElem ) {

            var uid = this.resolveUid( uidOrElem );

            return this.map[uid];
        },

        getUid: function ( dataItem ) {
            var uid,
                uids = Object.getOwnPropertyNames( this.map );

            for ( var i = 0; i < uids.length; i++ ) {
                uid = uids[i];
                if ( this.map[uid] === dataItem ) return uid;
            }

            return -1;
        },

        resolveUid: function ( uidOrElem ) {
            var uid = -1;

            if ( $.isNumeric( uidOrElem ) ) {
                uid = parseInt( uidOrElem );
            }
            else if ( $( uidOrElem ).is( '[data-uid]' ) ) {
                uid = parseInt( $( uidOrElem ).attr( 'data-uid' ) );
            }

            if ( isNaN( uid ) ) return -1;

            return uid;
        },

        remove: function ( uidOrElem ) {
            var uid = this.resolveUid( uidOrElem );

            if ( uid in this.map ) {
                delete this.map[uid];
            }
        },

        clear: function () {
            this.uid = 0;
            this.map = {};
        }

    };
    /***************\
         Editor
    \***************/

    gp.Editor = function ( config, dal, injector ) {

        this.config = config;
        this.dal = dal;
        this.uid = null;
        this.dataItem = null;
        this.originalDataItem = null;
        this.mode = null;
        this.beforeEdit = null;
        this.afterEdit = null;
        this.editReady = null;
        this.button = null;
        this.$n = $( config.node );
        this.injector = injector;

    };

    gp.Editor.prototype = {

        add: function ( dataItem ) {
            this.dataItem = dataItem || this.createDataItem();
            this.injector
                .setResource( '$dataItem', this.dataItem )
                .setResource( '$mode', 'create' );
            this.mode = 'create';

            // add the data item to the internal data array
            this.config.pageModel.data.push( this.dataItem );

            // map it
            this.uid = this.config.map.assign( this.dataItem );

            return {
                dataItem: this.dataItem,
                uid: this.uid
            };
        },

        edit: function ( dataItem ) {
            this.dataItem = dataItem;
            this.injector.setResource( '$dataItem', dataItem )
                .setResource( '$mode', 'update' );
            this.originalDataItem = gp.shallowCopy( dataItem );
            this.mode = 'update';
            return {
                dataItem: dataItem,
            };
        },

        cancel: function () {
            if ( this.mode === 'create' ) {
                // unmap the dataItem
                this.config.map.remove( this.uid );
                // remove the dataItem from the internal array
                var index = this.config.pageModel.data.indexOf( this.dataItem );
                if ( index !== -1 ) {
                    this.config.pageModel.data.slice( index, 1 );
                }
            }
            else if ( this.mode == 'update' && this.originalDataItem ) {
                //restore the dataItem to its original state
                gp.shallowCopy( this.originalDataItem, this.dataItem );
            }

            this.removeCommandHandler();
        },

        httpErrorHandler: function ( e ) {
            alert( 'An error occurred while carrying out your request.' );
            gp.error( e );
        },

        save: function ( done, fail ) {
            // create or update
            var self = this,
                returnedDataItem,
                serialized,
                uid,
                fail = fail || gp.error;

            this.addBusy();

            // it's possible for the API to invoke this save method
            // there won't be a form element in that case
            if ( this.elem ) {
                // serialize the form
                serialized = gp.ModelSync.serialize( this.elem );

                // currently the only supported post format is application/x-www-form-urlencoded
                // so normally there'd be no point in converting the serialized form values to their former types
                // but we can't rely on the server to return an updated model (it may simply return a success/fail message)
                // so we'll convert them anyway
                gp.ModelSync.castValues( serialized, this.config.columns );

                // copy the values back to the original dataItem
                gp.shallowCopy( serialized, this.dataItem );
            }

            if ( typeof this.beforeEdit == 'function' ) {
                this.beforeEdit( {
                    type: this.mode,
                    dataItem: this.dataItem,
                    elem: this.elem
                } );
            }

            if ( this.mode == 'create' ) {

                this.dal.create( this.dataItem, function ( updateModel ) {

                    try {
                        // standardize capitalization of incoming data
                        updateModel = gp.shallowCopy( updateModel, null, true );

                        if ( gp.hasValue( updateModel.errors ) ) {
                            self.validate( updateModel );
                        }
                        else {
                            returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem : ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] : self.dataItem;

                            // add the new dataItem to the internal data array
                            //self.config.pageModel.data.push( returnedDataItem );

                            // copy to local dataItem so updateUI will bind to current data
                            gp.shallowCopy( returnedDataItem, self.dataItem );

                            // It's important to map the dataItem after it's saved because user could cancel.
                            // Also the returned dataItem will likely have additional information added by the server.
                            //uid = self.config.map.assign( returnedDataItem, self.elem );

                            self.updateUI( self.config, self.dataItem, self.elem );

                            if ( self.removeCommandHandler ) self.removeCommandHandler();
                        }
                    }
                    catch ( err ) {
                        var error = fail || gp.error;
                        error( err );
                    }

                    if ( self.button instanceof HTMLElement ) gp.enable( self.button );

                    self.removeBusy();

                    if ( typeof self.afterEdit == 'function' ) {
                        self.afterEdit( {
                            type: self.mode,
                            dataItem: self.dataItem,
                            elem: self.elem
                        } );
                    }

                    gp.applyFunc( done, self.config.node.api, updateModel );
                },
                function ( e ) {
                    self.removeBusy();
                    gp.applyFunc( fail, self, e );
                } );

            }
            else {

                // call the data layer with just the dataItem
                // the data layer should respond with an updateModel
                this.dal.update( this.dataItem, function ( updateModel ) {

                    try {
                        // standardize capitalization of incoming data
                        updateModel = gp.shallowCopy( updateModel, null, true );

                        if ( gp.hasValue( updateModel.errors ) ) {
                            self.validate( updateModel );
                        }
                        else {
                            // copy the returned dataItem back to the internal data array
                            // use the existing dataItem if the response is empty
                            returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                                ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] : self.dataItem;
                            gp.shallowCopy( returnedDataItem, self.dataItem );

                            if ( self.elem ) {
                                // refresh the UI
                                self.updateUI( self.config, self.dataItem, self.elem );

                                if ( self.removeCommandHandler ) self.removeCommandHandler();
                            }
                        }
                    }
                    catch ( err ) {
                        fail( err );
                    }

                    if ( self.button instanceof HTMLElement ) gp.enable( self.button );

                    self.removeBusy();

                    if ( typeof self.afterEdit == 'function' ) {
                        self.afterEdit( {
                            type: self.mode,
                            dataItem: self.dataItem,
                            elem: self.elem
                        } );
                    }

                    gp.applyFunc( done, self.config.node, updateModel );
                },
                function ( e ) {
                    self.removeBusy();
                    gp.applyFunc( fail, self, e );
                } );

            }
        },

        addBusy: function () {
            this.$n.addClass( 'busy' );
        },

        removeBusy: function () {
            this.$n.removeClass( 'busy' );
        },

        updateUI: function () { },

        validate: function () { },

        createDataItem: function () {
            var field,
                dataItem = {};

            // set defaults
            this.config.columns.forEach( function ( col ) {
                var field = col.field || col.sort;
                if ( gp.hasValue( field ) ) {
                    if ( gp.hasValue( col.Type ) ) {
                        dataItem[field] = gp.getDefaultValue( col.Type );
                    }
                    else {
                        dataItem[field] = '';
                    }
                }
            } );

            // overwrite defaults with a model if specified
            if ( typeof this.config.model == 'object' ) {
                gp.shallowCopy( this.config.model, dataItem );
            }

            return dataItem;
        }

    };

    /***************\
     TableRowEditor
    \***************/

    gp.TableRowEditor = function ( config, dal, injector ) {

        var self = this;

        gp.Editor.call( this, config, dal, injector );

        this.elem = null;
        this.commandHandler = function ( evt ) {
            // handle save or cancel
            var command = $( this ).val();

            if ( /^(create|update|save)$/i.test( command ) ) {
                self.button = evt.target;
                // prevent double clicking
                gp.disable( self.button, 5 );
                self.save( null, self.httpErrorHandler );
            }
            else if ( /^cancel$/i.test( command ) ) self.cancel();
        };

    };

    gp.TableRowEditor.prototype = {

        save: gp.Editor.prototype.save,

        addBusy: gp.Editor.prototype.addBusy,

        removeBusy: gp.Editor.prototype.removeBusy,

        httpErrorHandler: gp.Editor.prototype.httpErrorHandler,

        createDataItem: gp.Editor.prototype.createDataItem,

        addCommandHandler: function () {
            $( this.elem ).on( 'click', 'button[value]', this.commandHandler );
        },

        removeCommandHandler: function () {
            $( this.elem ).off( 'click', this.commandHandler );
        },

        add: function ( dataItem ) {
            var self = this,
                tbody = this.$n.find( 'div.table-body > table > tbody' ),
                builder = new gp.NodeBuilder(),
                cellContent;

            var obj = gp.Editor.prototype.add.call( this, dataItem );

            builder.create( 'tr' ).addClass( 'create-mode' ).attr( 'data-uid', obj.uid );

            // add td.body-cell elements to the tr
            this.config.columns.forEach( function ( col ) {
                self.injector
                    .setResource( '$column', col )
                    .setResource( '$mode', 'create' );
                cellContent = col.readonly ?
                    self.injector.exec( 'bodyCellContent' ) :
                    self.injector.exec( 'editCellContent' );
                builder.create( 'td' ).addClass( 'body-cell' ).addClass( col.bodyclass ).html( cellContent );
                if ( col.commands ) {
                    builder.addClass( 'commands' );
                }
                if ( col.editclass ) {
                    builder.addClass( col.editclass );
                }
                builder.endElem();
            } );

            this.elem = builder.close();

            gp.ModelSync.bindElements( this.dataItem, this.elem );

            this.addCommandHandler();

            if ( this.config.newrowposition === 'top' ) {
                tbody.prepend( this.elem );
            }
            else {
                tbody.append( this.elem );
            }

            this.invokeEditReady();

            return {
                dataItem: this.dataItem,
                elem: this.elem
            };
        },

        edit: function ( dataItem, tr ) {

            // replace the cell contents of the table row with edit controls

            var self = this,
                col,
                cells = $( tr ).find( 'td.body-cell' ),
                uid;

            gp.Editor.prototype.edit.call( this, dataItem );

            this.elem = tr;

            this.addCommandHandler();

            // IE9 can't set innerHTML of tr, so iterate through each cell and set its innerHTML
            // besides, that way we can just skip readonly cells
            cells.each( function ( i ) {
                col = self.config.columns[i];
                self.injector
                    .setResource( '$column', col )
                    .setResource( '$mode', 'edit' );
                if ( !col.readonly ) {
                    $( this ).html( self.injector.exec( ' editCellContent ' ) );
                    if ( col.editclass ) {
                        $( this ).addClass( col.editclass );
                    }
                }
            } );

            $( tr ).addClass( 'edit-mode' );

            gp.ModelSync.bindElements( dataItem, this.elem );

            this.invokeEditReady();

            return {
                dataItem: dataItem,
                elem: this.elem
            };
        },

        cancel: function () {

            gp.Editor.prototype.cancel.call( this );

            try {
                var tbl = $( this.elem ).closest( 'table', this.$n ),
                    index;

                if ( $( this.elem ).hasClass( 'create-mode' ) ) {
                    // remove elem
                    tbl[0].deleteRow( this.elem.rowIndex );
                }
                else {
                    this.updateUI();
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }

        },

        validate: function ( updateModel ) {

            if ( typeof this.config.validate === 'function' ) {
                gp.applyFunc( this.config.validate, this, [this.elem, updateModel] );
            }
            else {

                var self = this,
                    builder = new gp.StringBuilder(),
                    errors,
                    msg;

                builder.add( 'Please correct the following errors:\r\n' );

                // remove error class from inputs
                $( self.elem ).find( '[name].error' ).removeClass( 'error' );

                Object.getOwnPropertyNames( updateModel.errors ).forEach( function ( e ) {

                    $( self.elem ).find( '[name="' + e + '"]' ).addClass( 'error' );

                    errors = updateModel.errors[e].errors;

                    builder
                        .add( e + ':\r\n' )
                        .add(
                        // extract the error message
                        errors.map( function ( m ) { return '    - ' + m + '\r\n'; } ).join( '' )
                    );
                } );

                alert( builder.toString() );
            }

        },

        updateUI: function () {
            // take the table row out of edit mode
            var self = this,
                col,
                cells = $( this.elem ).find( 'td.body-cell' );

            cells.each( function ( i ) {
                col = self.config.columns[i];
                self.injector.setResource( '$column', col );
                $( this ).html( self.injector.exec( 'bodyCellContent' ) );
                if ( col.editclass ) {
                    $( this ).removeClass( col.editclass );
                }
            } );
            $( this.elem ).removeClass( 'edit-mode create-mode' );
        },

        invokeEditReady: function () {
            if ( typeof this.editReady == 'function' ) {
                this.editReady( {
                    dataItem: this.dataItem,
                    elem: this.elem
                } );
            }
        }

    };


    /***************\
       ModalEditor
    \***************/

    gp.ModalEditor = function ( config, dal, injector ) {

        gp.TableRowEditor.call( this, config, dal, injector );

    };

    gp.ModalEditor.prototype = {

        save: gp.Editor.prototype.save,

        addBusy: gp.Editor.prototype.addBusy,

        removeBusy: gp.Editor.prototype.removeBusy,

        httpErrorHandler: gp.Editor.prototype.httpErrorHandler,

        addCommandHandler: gp.TableRowEditor.prototype.addCommandHandler,

        removeCommandHandler: gp.TableRowEditor.prototype.removeCommandHandler,

        validate: gp.TableRowEditor.prototype.validate,

        createDataItem: gp.Editor.prototype.createDataItem,

        invokeEditReady: gp.TableRowEditor.prototype.invokeEditReady,

        add: function ( dataItem ) {
            var self = this,
                html,
                modal;

            gp.Editor.prototype.add.call( this, dataItem );

            // mode: create or update
            html = this.injector.exec( 'bootstrapModalContent' );

            // append the modal to the top node so button clicks will be picked up by commandHandlder
            modal = $( html )
                .appendTo( this.config.node )
                .one( 'shown.bs.modal', self.invokeEditReady.bind( self ) );

            this.elem = modal[0];

            modal.modal( {
                show: true,
                keyboard: true,
                backdrop: 'static'
            } );

            gp.ModelSync.bindElements( this.dataItem, this.elem );

            modal.one( 'hidden.bs.modal', function () {
                $( modal ).remove();
            } );

            this.addCommandHandler();

            return {
                dataItem: this.dataItem,
                elem: this.elem
            };
        },

        edit: function ( dataItem ) {
            var self = this,
                html,
                modal;

            gp.Editor.prototype.edit.call( this, dataItem );

            // mode: create or update
            html = this.injector.exec( 'bootstrapModalContent' );

            // append the modal to the top node so button clicks will be picked up by commandHandlder
            modal = $( html )
                .appendTo( this.config.node )
                .one( 'shown.bs.modal', self.invokeEditReady.bind( self ) );

            this.elem = modal[0];

            modal.modal( {
                show: true,
                keyboard: true,
                backdrop: 'static'
            } );

            gp.ModelSync.bindElements( dataItem, this.elem );

            modal.one( 'hidden.bs.modal', function () {
                $( modal ).remove();
            } );

            this.addCommandHandler();

            return {
                dataItem: dataItem,
                elem: this.elem
            };

        },

        cancel: function () {

            gp.Editor.prototype.cancel.call( this );

            $( this.elem ).modal( 'hide' );
        },

        updateUI: function () {

            var self = this,
                tbody = this.$n.find( 'div.table-body > table > tbody' ),
                tableRow,
                cells,
                col,
                uid,
                builder,
                cellContent;

            $( this.elem ).modal( 'hide' );

            // if we added a row, add a row to the top of the table
            if ( this.mode == 'create' ) {

                // the save method should have added a uid attr to the modal
                uid = this.config.map.resolveUid( this.elem );

                // make sure we have a uid
                if ( uid == -1 ) {
                    uid = this.config.map.assign( this.dataItem );
                }

                builder = new gp.NodeBuilder().create( 'tr' ).attr( 'data-uid', uid );

                // add td.body-cell elements to the tr
                this.config.columns.forEach( function ( col ) {
                    cellContent = self.injector.setResource( '$column', col ).exec( 'bodyCellContent' );
                    builder.create( 'td' ).addClass( 'body-cell' ).addClass( col.bodyclass ).html( cellContent ).endElem();
                } );

                tableRow = builder.close();

                if ( this.config.newrowposition === 'top' ) {
                    tbody.prepend( tableRow );
                }
                else {
                    tbody.append( tableRow );
                }
            }
            else {
                tableRow = gp.getTableRow( this.config.map, this.dataItem, this.config.node );

                if ( tableRow ) {
                    $( tableRow ).find( 'td.body-cell' ).each( function ( i ) {
                        col = self.config.columns[i];
                        self.injector.setResource( '$column', col );
                        $( this ).html( self.injector.exec( 'bodyCellContent' ) );
                    } );
                }
            }

        }

    };
    /***************\
       formatter
    \***************/

    // Use moment.js to format dates.
    // Use numeral.js to format numbers.
    gp.Formatter = function () { };

    gp.Formatter.prototype = {
        format: function ( val, format ) {
            var type = gp.getType( val );

            try {
                if ( /^(date|datestring)$/.test( type ) ) {
                    format = format || 'M/D/YYYY h:mm a';
                    return moment( val ).format( format );
                }
                if ( type === 'timestamp' ) {
                    format = format || 'M/D/YYYY h:mm a';
                    val = parseInt( val.match( gp.rexp.timestamp )[1] );
                    return moment( val ).format( format );
                }
                if ( type === 'number' ) {
                    // numeral's defaultFormat option doesn't work as of 3/25/2016
                    format = format || '0,0';
                    return numeral( val ).format( format );
                }
            }
            catch ( e ) {
                gp.error( e );
            }
            return val;
        }
    };
    /***************\
        helpers
    \***************/

    gp.helpers = {

        setPagerFlags: function () {
            this.pageModel.IsFirstPage = this.pageModel.page === 1;
            this.pageModel.IsLastPage = this.pageModel.page === this.pageModel.pagecount;
            this.pageModel.HasPages = this.pageModel.pagecount > 1;
            this.pageModel.PreviousPage = this.pageModel.page === 1 ? 1 : this.pageModel.page - 1;
            this.pageModel.NextPage = this.pageModel.page === this.pageModel.pagecount ? this.pageModel.pagecount : this.pageModel.page + 1;
        },

        sortStyle: function ( config ) {
            // remove glyphicons from sort buttons
            var spans = $( config.node )
                .find( 'a.table-sort > span.glyphicon-chevron-up,a.table-sort > span.glyphicon-chevron-down' )
                .removeClass( 'glyphicon-chevron-up glyphicon-chevron-down' );
            if ( !gp.isNullOrEmpty( config.pageModel.sort ) ) {
                $( config.node )
                    .find( 'a.table-sort[data-sort="' + config.pageModel.sort + '"] > span' )
                    .addClass(( config.pageModel.desc ? 'glyphicon-chevron-down' : 'glyphicon-chevron-up' ) );
            }
        }

    };

    /***************\
         http        
    \***************/
    gp.Http = function () { };

    gp.Http.prototype = {
        get: function ( url, callback, error ) {
            $.get( url ).done( callback ).fail( error );
        },
        post: function ( url, data, callback, error ) {
            this.ajax( url, data, callback, error, 'POST' );
        },
        destroy: function ( url, callback, error ) {
            this.ajax( url, null, callback, error, 'DELETE' );
        },
        ajax: function ( url, data, callback, error, httpVerb ) {
            $.ajax( {
                url: url,
                type: httpVerb.toUpperCase(),
                data: data,
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
            } )
                .done( callback )
                .fail( function ( response ) {
                    if ( response.status ) {
                        // don't know why jQuery calls fail on DELETE
                        if ( response.status == 200 ) {
                            callback( response );
                            return;
                        }
                        // filter out authentication errors, those are usually handled by the browser
                        if ( /401|403|407/.test( response.status ) == false && typeof error == 'function' ) {
                            error( response );
                        }
                    }
                } );
        }

    };
    /***************\
       Initializer
    \***************/
    gp.Initializer = function ( node ) {
        this.parent = $( node );
    };

    gp.Initializer.prototype = {

        initialize: function ( callback ) {
            this.config = this.getConfig( this.parent );
            return this.initializeOptions( this.config, callback );
        },

        initializeOptions: function ( options, callback ) {
            var self = this;
            options.pageModel = {};
            options.ID = gp.createUID();
            this.config = options;
            this.config.map = new gp.DataMap();
            this.config.pageModel = new gp.PagingModel();
            this.config.editmode = this.config.editmode || 'inline';
            this.config.newrowposition = this.config.newrowposition || 'top';

            // this has to be defined before renderLayout
            this.injector = new gp.Injector( {
                $config: this.config,
                $columns: this.config.columns,
                $node: this.config.node,
                $pageModel: this.config.pageModel,
                $map: this.config.map,
                $data: this.config.pageModel.data
            }, gp.templates, null, this.config ); // specify gp.templates as root, null for context, config as override source

            // this has to happen here so we can find the table-container
            this.renderLayout( this.config, this.parent );

            this.config.node = this.parent.find( '.table-container' )[0];
            this.$n = this.parent.find( '.table-container' );

            var dal = new gp.DataLayer( this.config );
            var controller = new gp.Controller( this.config, dal, this.config.pageModel, this.injector );
            this.config.node.api = new gp.api( controller );
            this.config.hasFooter = this.resolveFooter( this.config );
            this.config.preload = this.config.preload === false ? this.config.preload : true;
            this.injector.context = this.config.node.api;

            setTimeout( function () {
                // do this here to give external scripts a chance to run first
                self.resolveTopLevelOptions( self.config );

                self.addEventDelegates( self.config, controller );

                // provides a hook for extensions
                controller.invokeDelegates( gp.events.beforeInit, self.config );

                if ( self.config.preload ) {
                    // we need both beforeInit and beforeread because beforeread is used after every read in the controller
                    // and beforeInit happens just once after the node is created, but before first read
                    controller.invokeDelegates( gp.events.beforeRead, self.config.pageModel );

                    dal.read( self.config.pageModel,
                        function ( data ) {
                            try {
                                gp.shallowCopy( data, self.config.pageModel, true );
                                self.injector.setResource( '$data', self.config.pageModel.data );
                                gp.resolveTypes( self.config );
                                self.resolveCommands( self.config );
                                self.render( self.config );
                                controller.init();
                                if ( typeof callback === 'function' ) callback( self.config );
                            } catch ( e ) {
                                gp.error( e );
                            }
                            controller.invokeDelegates( gp.events.onRead, self.config.pageModel );
                        },
                        function ( e ) {
                            controller.invokeDelegates( gp.events.httpError, e );
                            alert( 'An error occurred while carrying out your request.' );
                            gp.error( e );
                        }
                    );
                }
                else {
                    gp.resolveTypes( self.config );
                    self.resolveCommands( self.config );
                    controller.init();
                }

            } );

            return this.config;
        },

        getConfig: function ( parentNode ) {
            var self = this,
                obj,
                colConfig,
                templates,
                config = gp.getAttributes( parentNode ),
                gpColumns = $( parentNode ).find( 'gp-column' );

            config.columns = [];

            // create the column configurations
            templates = 'header body edit footer'.split( ' ' );
            gpColumns.each( function () {
                colConfig = gp.getAttributes( this );
                config.columns.push( colConfig );
                self.resolveTemplates( templates, colConfig, this, 'template' );
            } );

            // resolve the various templates
            this.resolveTemplates( Object.getOwnPropertyNames( gp.templates ), config, parentNode, '' );

            return config;
        },

        addEventDelegates: function ( config, controller ) {
            var self = this, name, fn, api = config.node.api;
            Object.getOwnPropertyNames( gp.events ).forEach( function ( event ) {
                name = gp.events[event];
                fn = config[name];
                if ( typeof fn === 'string' ) {
                    fn = gp.getObjectAtPath( fn );
                }

                // event delegates must point to a function
                if ( typeof fn == 'function' ) {
                    config[name] = fn;
                    controller.addDelegate( name, fn );
                }
            } );
        },

        renderLayout: function ( config, parentNode ) {
            try {
                $( parentNode ).html( this.injector.exec( 'container' ) );
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },

        render: function ( config ) {
            var self = this;
            try {
                var node = config.node;

                // inject table rows, footer, pager and header style.

                var body = this.$n.find( 'div.table-body' );
                var footer = this.$n.find( 'div.table-footer' );
                var pager = this.$n.find( 'div.table-pager' );

                body.html( self.injector.exec( 'tableBody' ) );
                footer.html( self.injector.exec( 'footerTable' ) );
                pager.html( self.injector.exec( 'pagerBar' ) );
                gp.helpers.sortStyle( config );

                // sync column widths
                if ( config.fixedheaders || config.fixedfooters ) {
                    var nodes = this.$n.find( '.table-body > table > tbody > tr:first-child > td' );

                    if ( gp.hasPositiveWidth( nodes ) ) {
                        // call syncColumnWidths twice because the first call causes things to shift around a bit
                        self.syncColumnWidths( config )
                        self.syncColumnWidths( config )
                    }

                    window.addEventListener( 'resize', function () {
                        self.syncColumnWidths( config );
                    } );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },

        syncColumnWidths: function ( config ) {
            var html = this.injector.exec( 'columnWidthStyle' );
            this.$n.find( 'style.column-width-style' ).html( html );
        },

        resolveFooter: function ( config ) {
            for ( var i = 0; i < config.columns.length; i++ ) {
                if ( config.columns[i].footertemplate ) return true;
            }
            return false;
        },

        resolveTopLevelOptions: function ( config ) {
            // resolve the top level configurations
            var obj, options = 'rowselected searchfunction read create update destroy validate model'.split( ' ' );
            options.forEach( function ( option ) {
                if ( gp.hasValue( config[option] ) ) {
                    // see if this config option points to an object
                    // otherwise it must be a URL
                    obj = gp.getObjectAtPath( config[option] );

                    if ( gp.hasValue( obj ) ) config[option] = obj;
                }
            } );
        },

        resolveTemplates: function ( names, config, node, suffix ) {
            var selector,
                template,
                prop,
                $node = $( node ),
                selectorTemplate = 'script[type="text/html"][data-template*="{{name}}"],template[data-template*="{{name}}"]';
            names.forEach( function ( n ) {
                selector = gp.supplant( selectorTemplate, { name: n } );
                template = $node.find( selector );
                if ( template.length ) {
                    for ( var i = 0; i < $node[0].children.length; i++ ) {
                        if ( $node[0].children[i] == template[0] ) {
                            prop = gp.camelize( n ) + suffix;
                            config[prop] = template[0].innerHTML;
                            return;
                        }
                    }
                }
            } );
        },

        resolveCommands: function ( config ) {
            var match, val, commands, index = 0;
            config.columns.forEach( function ( col ) {
                if ( typeof col.commands == 'string' ) {
                    commands = [];
                    col.commands.split( ',' ).forEach( function ( cmd ) {
                        match = cmd.split( ':' );
                        commands.push( {
                            text: match[0],
                            value: match[1],
                            btnClass: match[2],
                            glyphicon: match[3],
                        } );
                    } );
                    col.commands = commands;
                }
                if ( Array.isArray( col.commands ) ) {
                    col.commands.forEach( function ( cmd ) {
                        cmd.text = cmd.text || cmd.value;
                        cmd.value = cmd.value || cmd.text;
                        cmd.btnClass = cmd.btnClass || ( /delete|destroy/i.test( cmd.text ) ? 'btn-danger' : 'btn-default' );
                        cmd.glyphicon = cmd.glyphicon || ( /delete|destroy/i.test( cmd.text ) ? 'glyphicon-remove' : ( /edit/i.test( cmd.text ) ? 'glyphicon-edit' : 'glyphicon-cog' ) );
                        cmd.func = cmd.func || gp.getObjectAtPath( cmd.value );
                    } );
                }
            } );
        }
    };
    /***************\
        Injector
    \***************/

    gp.Injector = function ( resources, root, context, overrides ) {
        this.resources = resources;
        resources.$injector = this;
        this.root = root || window;
        this.context = context || this;
        this.overrides = overrides || {};
    };

    gp.Injector.prototype = {
        setResource: function ( name, value ) {
            this.resources[name] = value;
            return this;
        },
        base: function ( funcOrName, model ) {
            return this.exec( funcOrName, model, true );
        },
        exec: function ( funcOrName, model, base ) {
            var args;
            if ( typeof funcOrName == 'string' ) {
                if ( base ) {
                    // call the base function
                    funcOrName = gp.getObjectAtPath( funcOrName, this.root );
                }
                else {
                    // check for override
                    funcOrName = gp.getObjectAtPath( funcOrName, this.overrides ) || gp.getObjectAtPath( funcOrName, this.root );
                }
            }
            if ( typeof funcOrName == 'function' ) {
                args = this.inject( funcOrName );
                if ( gp.hasValue( model ) ) {
                    args.push( model );
                }
                // supply this injector as the context
                return funcOrName.apply( this.context, args );
            }
            else {
                return gp.supplant.call( this.context, funcOrName, this.resources );
            }
            return this;
        },
        inject: function ( func ) {
            var self = this,
                params,
                args = [];

            if ( func.$inject ) {
                params = func.$inject;
            }
            else {
                params = this.getParamNames( func );
            }

            params.forEach( function ( param ) {
                if ( self.resources.hasOwnProperty( param ) ) {
                    args.push( self.resources[param] );
                }
                    // injectable params should start with $
                else if ( param[0] === '$' ) {
                    throw "Unrecognized dependency: " + param;
                }
            } );

            return args;
        },
        // http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
        getParamNames: function ( func ) {
            var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
            var ARGUMENT_NAMES = /([^\s,]+)/g;
            var fnStr = func.toString().replace( STRIP_COMMENTS, '' );
            var result = fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' ) ).match( ARGUMENT_NAMES );
            if ( result === null )
                result = [];
            return result;
        }

    };
    /***************\
       ModelSync
    \***************/

    gp.ModelSync = {

        rexp: {
            rTrue: /^true$/i,
            rFalse: /^false$/i,
        },

        serialize: function ( form ) {
            var inputs = $( form ).find( ':input[name]' ),
                arr,
                obj = {};

            inputs.each( function () {
                // add properties for each named element in the form
                // so unsuccessful form elements are still explicitly represented
                obj[this.name] = null;
            } );

            arr = $( inputs ).serializeArray();

            arr.forEach( function ( item ) {
                // if there are multiple elements with this name assume an array
                if ( obj[item.name] !== null && !Array.isArray( obj[item.name] ) ) {
                    obj[item.name] = [obj[item.name]];
                }
                if ( Array.isArray( obj[item.name] ) ) {
                    obj[item.name].push( item.value );
                }
                else {
                    obj[item.name] = item.value;
                }
            } );

            return obj;
        },

        bindElements: function ( model, context ) {
            var self = this,
                value;

            Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
                value = model[prop];
                if ( Array.isArray( value ) ) {
                    value.forEach( function ( val ) {
                        self.bindElement( prop, val, context );
                    } );
                }
                else {
                    self.bindElement( prop, value, context );
                }
            } );
        },

        bindElement: function ( prop, value, context ) {
            var self = this,
                clean,
                elem;

            value = gp.hasValue( value ) ? value.toString() : '';

            // is there a checkbox or radio with this name and value?
            // don't select the value because it might throw a syntax error
            elem = $( context ).find( '[type=checkbox][name="' + prop + '"],[type=radio][name="' + prop + '"]' );

            if ( elem.length > 0 ) {

                clean = gp.escapeHTML( value );

                for ( var i = 0; i < elem.length; i++ ) {
                    if ( elem[i].value == value || elem[i].value == clean ) {
                        elem[i].checked = true;
                        return;
                    }
                }
            }

            // check for boolean
            if ( /^(true|false)$/i.test( value ) ) {
                elem = $( context ).find( '[type=checkbox][name="' + prop + '"][value=true],[type=checkbox][name="' + prop + '"][value=false]' );

                if ( elem.length > 0 ) {
                    elem.each( function ( e ) {
                        this.checked = (
                            ( self.rexp.rTrue.test( value ) && self.rexp.rTrue.test( e.value ) )
                            ||
                            ( self.rexp.rFalse.test( value ) && self.rexp.rFalse.test( e.value ) )
                        );
                    } );

                    return;
                }
            }

            elem = $( context ).find( '[name="' + prop + '"]' );
            if ( elem.length > 0 ) {

                // inputs with a value property
                if ( elem[0].value !== undefined ) {
                    elem.val( value );
                }
                    // inputs without a value property (e.g. textarea)
                else if ( elem[0].innerHTML !== undefined ) {
                    elem.html( value == null ? '' : gp.escapeHTML( value ) );
                }

            }

        },

        castValues: function ( model, columns ) {
            var col;

            Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
                col = gp.getColumnByField( columns, prop );

                if ( col && col.Type ) {
                    model[prop] = this.cast( model[prop], col.Type );
                }
            }.bind( this ) );
        },

        cast: function ( val, dataType ) {
            switch ( dataType ) {
                case 'number':
                    if ( $.isNumeric( val ) ) return parseFloat( val );
                    break;
                case 'boolean':
                    return val != null && val.toLowerCase() == 'true';
                    break;
                case 'null':
                case 'undefined':
                    if ( /true|false/i.test( val ) ) {
                        // assume boolean
                        return val != null && val.toLowerCase() == 'true';
                    }
                    return val === '' ? null : val;
                    break;
                default:
                    return val === '' ? null : val;
                    break;
            }
        }
    };
    /***************\
       NodeBuilder
    \***************/

    gp.NodeBuilder = function ( parent ) {
        this.node = parent || null;
    };

    gp.NodeBuilder.prototype = {

        create: function ( tagName ) {
            var n = document.createElement( tagName );

            if ( this.node ) {
                this.node.appendChild( n );
            }

            this.node = n;

            return this;
        },

        addClass: function ( name ) {
            if ( gp.isNullOrEmpty( name ) ) return this;

            var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;

            if ( !hasClass ) {
                this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
            }

            return this;
        },

        html: function ( html ) {
            this.node.innerHTML = gp.hasValue( html ) ? html : '';
            return this;
        },

        endElem: function () {
            if ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this;
        },

        attr: function ( name, value ) {
            this.node.setAttribute( name, value );
            return this;
        },

        close: function () {
            while ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this.node;
        }

    };
    /***************\
    server-side pager
    \***************/
    gp.ServerPager = function ( url ) {
        this.url = url;
    };

    gp.ServerPager.prototype = {
        read: function ( model, callback, error ) {
            var copy = gp.shallowCopy( model );
            // delete anything we don't want to send to the server
            var props = Object.getOwnPropertyNames( copy ).forEach( function ( prop ) {
                if ( /^(page|top|sort|desc|search)$/i.test( prop ) == false ) {
                    delete copy[prop];
                }
            } );
            var url = gp.supplant( this.url, model, model );
            var h = new gp.Http();
            h.post( url, copy, callback, error );
        }
    };


    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function ( config ) {
        var value, self = this;
        this.data = config.pageModel.data;
        this.columns = config.columns.filter( function ( c ) {
            return c.field !== undefined || c.sort !== undefined;
        } );
        if ( typeof config.searchfunction === 'function' ) {
            this.searchFilter = config.searchfunction;
        }
        else {
            this.searchFilter = function ( row, search ) {
                var s = search.toLowerCase();
                for ( var i = 0; i < self.columns.length; i++ ) {
                    value = gp.getFormattedValue( row, self.columns[i], false );
                    if ( gp.hasValue( value ) && value.toString().toLowerCase().indexOf( s ) !== -1 ) {
                        return true;
                    }
                }
                return false;
            };
        }
    };

    gp.ClientPager.prototype = {
        read: function ( model, callback, error ) {
            try {
                var self = this,
                    search,
                    skip = this.getSkip( model );

                // don't modify the original array
                model.data = this.data.slice( 0, this.data.length );

                // filter first
                if ( !gp.isNullOrEmpty( model.search ) ) {
                    // make sure searchTerm is a string and trim it
                    search = $.trim( model.search.toString() );
                    model.data = model.data.filter( function ( row ) {
                        return self.searchFilter( row, search );
                    } );
                }

                // set totalrows after filtering, but before paging
                model.totalrows = model.data.length;

                model.pagecount = this.getPageCount( model );

                // then sort
                if ( gp.isNullOrEmpty( model.sort ) === false ) {
                    var col = gp.getColumnByField( this.columns, model.sort );
                    if ( gp.hasValue( col ) ) {
                        var sortFunction = this.getSortFunction( col, model.desc );
                        model.data.sort( function ( row1, row2 ) {
                            return sortFunction( row1[model.sort], row2[model.sort] );
                        } );
                    }
                }

                // then page
                if ( model.top !== -1 ) {
                    model.data = model.data.slice( skip ).slice( 0, model.top );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
            callback( model );
        },
        getSkip: function ( model ) {
            var data = model;
            if ( data.pagecount == 0 ) {
                return 0;
            }
            if ( data.page < 1 ) {
                data.page = 1;
            }
            else if ( data.page > data.pagecount ) {
                return data.page = data.pagecount;
            }
            return ( data.page - 1 ) * data.top;
        },
        getPageCount: function ( model ) {
            if ( model.top > 0 ) {
                return Math.ceil( model.totalrows / model.top );
            }
            if ( model.totalrows === 0 ) return 0;
            return 1;
        },
        getSortFunction: function ( col, desc ) {
            if ( /^(number|date|boolean)$/.test( col.Type ) ) {
                if ( desc ) {
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
                if ( desc ) {
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function ( a, b ) {
            return b - a;
        },
        diffSortAsc: function ( a, b ) {
            return a - b;
        },
        stringSortDesc: function ( a, b ) {
            if ( gp.hasValue( a ) === false ) {
                if ( gp.hasValue( b ) ) {
                    return 1;
                }
                return 0;
            }
            else if ( gp.hasValue( b ) === false ) {
                // we already know a isn't null
                return -1;
            }

            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string

            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
                return -1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
                return 1;
            }

            return 0;
        },
        stringSortAsc: function ( a, b ) {
            if ( gp.hasValue( a ) === false ) {
                if ( gp.hasValue( b ) ) {
                    return -1;
                }
                return 0;
            }
            else if ( gp.hasValue( b ) === false ) {
                // we already know a isn't null
                return 1;
            }

            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string

            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
                return 1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
                return -1;
            }

            return 0;
        }
    };

    /***************\
      FunctionPager
    \***************/

    gp.FunctionPager = function ( config ) {
        this.config = config;
    };

    gp.FunctionPager.prototype = {
        read: function ( model, callback, error ) {
            try {
                var self = this,
                    result = this.config.read( model, callback.bind( this ) );
                // check if the function returned a value instead of using the callback
                if ( gp.hasValue( result ) ) {
                    callback( result );
                }
            }
            catch ( ex ) {
                if ( typeof error === 'function' ) {
                    gp.applyFunc( error, this, ex );
                }
                else {
                    gp.applyFunc( callback, this, this.config );
                }
                gp.error( ex );
            }
        }
    };
    /***************\
      PagingModel
    \***************/
    gp.PagingModel = function ( data ) {
        var self = this;
        // properites are capitalized here because that's the convention for server-side classes (C#)
        // we want the serialized version of the corresponding server-side class to look exactly like this prototype

        this.top = -1; // this is a flag to let the pagers know if paging is enabled
        this.page = 1;
        this.sort = '';
        this.desc = false;
        this.search = '';
        this.data = data || [];
        this.totalrows = ( data != undefined && data.length ) ? data.length : 0;
        this.pagecount = 0;

        Object.defineProperty( self, 'pageindex', {
            get: function () {
                return self.page - 1;
            }
        } );

        Object.defineProperty( self, 'skip', {
            get: function () {
                if ( self.top !== -1 ) {
                    if ( self.pagecount === 0 ) return 0;
                    if ( self.page < 1 ) self.page = 1;
                    else if ( self.page > self.pagecount ) return self.page = self.pagecount;
                    return self.pageindex * self.top;
                }
                return 0;
            }
        } );
    };
    /***************\
      StringBuilder
    \***************/

    gp.StringBuilder = function () {
        this.out = [];
    };

    gp.StringBuilder.prototype = {

        add: function ( str ) {
            this.out.push( str );
            return this;
        },

        escape: function ( str ) {
            this.out.push( gp.escapeHTML( str ) );
            return this;
        },

        toString: function () {
            return this.out.join( '' );
        }

    };
    /***************\
        templates
    \***************/
    gp.templates = gp.templates || {};

    gp.templates.bodyCellContent = function ( $column, $dataItem, $injector ) {
        var self = this,
            template,
            format,
            val,
            glyphicon,
            btnClass,
            hasDeleteBtn = false,
            type = ( $column.Type || '' ).toLowerCase(),
            html = new gp.StringBuilder();

        if ( $dataItem == null ) return;

        val = gp.getFormattedValue( $dataItem, $column, true );

        // check for a template
        if ( $column.bodytemplate ) {
            if ( typeof ( $column.bodytemplate ) === 'function' ) {
                html.add( gp.applyFunc( $column.bodytemplate, this, [$dataItem, $column] ) );
            }
            else {
                html.add( gp.supplant.call( this, $column.bodytemplate, $dataItem, [$dataItem, $column] ) );
            }
        }
        else if ( $column.commands && $column.commands.length ) {
            html.add( '<div class="btn-group btn-group-xs" role="group">' );
            $column.commands.forEach( function ( cmd, index ) {
                html.add( $injector.exec( 'button', cmd ) );
            } );
            html.add( '</div>' );
        }
        else if ( gp.hasValue( val ) ) {
            // show a checkmark for bools
            if ( type === 'boolean' ) {
                if ( val === true ) {
                    html.add( '<span class="glyphicon glyphicon-ok"></span>' );
                }
            }
            else {
                // getFormattedValue has already escaped html
                html.add( val );
            }
        }
        return html.toString();
    };

    gp.templates.bodyCellContent.$inject = ['$column', '$dataItem', '$injector'];

    gp.templates.bootstrapModal = function ( model ) {
        model.footer = model.footer ||
            '<div class="btn-group"><button type="button" class="btn btn-default" value="cancel"><span class="glyphicon glyphicon-remove"></span>Close</button><button type="button" class="btn btn-primary" value="save"><span class="glyphicon glyphicon-save"></span>Save changes</button></div>';

        var html = new gp.StringBuilder();
        html.add( '<div class="modal fade" tabindex="-1" role="dialog" data-uid="{{uid}}">' )
            .add( '<div class="modal-dialog" role="document">' )
            .add( '<div class="modal-content">' )
            .add( '<div class="modal-header">' )
            .add( '<button type="button" class="close" aria-label="Close" value="cancel"><span aria-hidden="true">&times;</span></button>' )
            .add( '<h4 class="modal-title">{{title}}</h4>' )
            .add( '</div>' )
            .add( '<div class="modal-body">{{{body}}}</div>' )
            .add( '<div class="modal-footer">{{{footer}}}</div>' )
            .add( '</div>' )
            .add( '<div class="gp-progress-overlay">' )
            .add( '<div class="gp-progress gp-progress-container">' )
            .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
            .add( '</div>' )
            .add( '</div>' )
            .add( '</div>' )
            .add( '</div>' );

        return gp.supplant.call( this, html.toString(), model );
    };

    gp.templates.bootstrapModalContent = function ( $config, $dataItem, $mode, $injector ) {

        var self = this,
            model = {
                title: ( $mode == 'create' ? 'Add' : 'Edit' ),
                body: '',
                footer: null,
                uid: $config.map.getUid( $dataItem )
            };

        var html = new gp.StringBuilder();

        // not using a form element here because the modal is added as a child node of the grid component
        // this will cause problems if the grid is inside another form (e.g. jQuery.validate will behave unexpectedly)
        html.add( '<div class="form-horizontal">' );

        $config.columns.forEach( function ( col ) {
            $injector.setResource( '$column', col );
            if ( col.commands ) {
                model.footer = $injector.exec( 'editCellContent' );
                return;
            }
            var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
            if ( !canEdit ) return;

            var formGroupModel = {
                label: null,
                input: $injector.exec( 'editCellContent' ),
                editclass: col.editclass
            };

            // headers become labels
            // check for a template
            if ( col.headertemplate ) {
                if ( typeof ( col.headertemplate ) === 'function' ) {
                    formGroupModel.label = ( gp.applyFunc( col.headertemplate, self, [col] ) );
                }
                else {
                    formGroupModel.label = ( gp.supplant.call( self, col.headertemplate, [col] ) );
                }
            }
            else {
                formGroupModel.label = gp.escapeHTML( gp.coalesce( [col.header, col.field, ''] ) );
            }

            html.add( $injector.exec( 'formGroup', formGroupModel ) );
        } );

        html.add( '</div>' );

        model.body = html.toString();

        return $injector.exec( 'bootstrapModal', model );
    };

    gp.templates.bootstrapModalContent.$inject = ['$config', '$dataItem', '$mode', '$injector'];

    gp.templates.button = function ( model ) {
        var template = '<button type="button" class="btn {{btnClass}}" value="{{value}}"><span class="glyphicon {{glyphicon}}"></span>{{text}}</button>';
        return gp.supplant.call( this, template, model );
    };

    gp.templates.columnWidthStyle = function ( $config, $columns ) {
        var html = new gp.StringBuilder(),
            width,
            index = 0,
            bodyCols = document.querySelectorAll( '#' + $config.ID + ' .table-body > table > tbody > tr:first-child > td' );

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        $columns.forEach( function ( col ) {
            if ( col.width ) {
                // fixed width should include the body
                html.add( '#' + $config.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + $config.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( ',' )
                    .add( '#' + $config.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + $config.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( col.width );
                if ( isNaN( col.width ) == false ) html.add( 'px' );
                html.add( ';}' );
            }
            else if ( bodyCols.length && ( $config.fixedheaders || $config.fixedfooters ) ) {
                // sync header and footer to body
                width = bodyCols[index].offsetWidth;
                html.add( '#' + $config.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + $config.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( bodyCols[index].offsetWidth )
                    .add( 'px;}' );
            }
            index++;
        } );

        return html.toString();
    };

    gp.templates.columnWidthStyle.$inject = ['$config', '$columns'];

    gp.templates.container = function ( $config, $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<div class="gp table-container ' )
            .add( $injector.exec( 'containerClasses' ) )
            .add( '" id="' )
            .add( $config.ID )
            .add( '">' );
        if ( $config.search || $config.create || $config.toolbar ) {
            html.add( '<div class="table-toolbar">' );
            html.add( $injector.exec( 'toolbar' ) );
            html.add( '</div>' );
        }
        if ( $config.fixedheaders ) {
            html.add( '<div class="table-header">' )
                .add( '<table class="table" cellpadding="0" cellspacing="0">' )
                .add( $injector.exec( 'header' ) )
                .add( '</table>' )
                .add( '</div>' );
        }
        html.add( '<div class="table-body ' );
        if ( $config.fixedheaders ) {
            html.add( 'table-scroll' );
        }
        html.add( '">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0"><tbody></tbody></table>' )
            .add( '</div>' );
        if ( $config.fixedfooters ) {
            html.add( '<div class="table-footer"></div>' );
        }
        if ( $config.pager ) {
            html.add( '<div class="table-pager"></div>' );
        }
        html.add( '<style type="text/css" class="column-width-style">' )
            .add( $injector.exec( 'columnWidthStyle' ) )
            .add( '</style>' )
            .add( '<div class="gp-progress-overlay">' )
            .add( '<div class="gp-progress gp-progress-container">' )
            .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
            .add( '</div>' )
            .add( '</div>' )
            .add( '</div>' );
        return html.toString();
    };

    gp.templates.container.$inject = ['$config', '$injector'];

    gp.templates.containerClasses = function ( $config ) {
        var classes = [];
        if ( $config.fixedheaders ) {
            classes.push( 'fixed-headers' );
        }
        if ( $config.fixedfooters ) {
            classes.push( 'fixed-footers' );
        }
        if ( $config.pager ) {
            classes.push( 'pager-' + $config.pager );
        }
        if ( $config.responsive ) {
            classes.push( 'table-responsive' );
        }
        if ( $config.search ) {
            classes.push( 'search-' + $config.search );
        }
        if ( $config.rowselected ) {
            classes.push( 'selectable' );
        }
        if ( $config.containerclass ) {
            classes.push( $config.containerclass );
        }
        return classes.join( ' ' );
    };

    gp.templates.containerClasses.$inject = ['$config'];

    gp.templates.editCellContent = function ( $column, $dataItem, $mode, $config, $injector ) {
        var template,
            col = $column,
            html = new gp.StringBuilder();

        // check for a template
        if ( col.edittemplate ) {
            if ( typeof ( col.edittemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.edittemplate, this, [$dataItem, col] ) );
            }
            else {
                html.add( gp.supplant.call( this, col.edittemplate, $dataItem, [$dataItem, col] ) );
            }
        }
        else if ( col.commands ) {
            html.add( '<div class="btn-group' )
                .add( $config.editmode == 'inline' ? ' btn-group-xs' : '' )
                .add( '">' )
                .add( $injector.exec( 'button', {
                    btnClass: 'btn-primary',
                    value: ( $mode == 'create' ? 'create' : 'update' ),
                    glyphicon: 'glyphicon-save',
                    text: 'Save'
                } ) )
                .add( '<button type="button" class="btn btn-default" data-dismiss="modal" value="cancel">' )
                .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                .add( '</button>' )
                .add( '</div>' );
        }
        else {
            var val = $dataItem[col.field];
            // render undefined/null as empty string
            if ( !gp.hasValue( val ) ) val = '';
            html.add( $injector.exec( 'input', { type: col.Type, name: col.field, value: "", required: ( $column.required || false ) } ) );
        }
        return html.toString();
    };

    gp.templates.editCellContent.$inject = ['$column', '$dataItem', '$mode', '$config', '$injector'];

    gp.templates.footer = function ( $columns, $injector ) {
        var self = this,
            html = new gp.StringBuilder();
        html.add( '<tfoot>' )
            .add( '<tr>' )
        $columns.forEach( function ( col ) {
            $injector.setResource( '$column', col );
            html.add( $injector.exec( 'footerCell' ) );
        } );
        html.add( '</tr>' )
            .add( '</tfoot>' );
        return html.toString();
    };

    gp.templates.footer.$inject = ['$columns', '$injector'];

    gp.templates.footerCell = function ( $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<td class="footer-cell">' )
            .add( $injector.exec( 'footerCellContent' ) )
            .add( '</td>' );
        return html.toString();
    };

    gp.templates.footerCell.$inject = ['$injector'];

    gp.templates.footerCellContent = function ( $data, $column ) {
        var html = new gp.StringBuilder();
        if ( $column.footertemplate ) {
            if ( typeof ( $column.footertemplate ) === 'function' ) {
                html.add( gp.applyFunc( $column.footertemplate, this, [$column, $data] ) );
            }
            else {
                html.add( gp.supplant.call( this, $column.footertemplate, $column, [$column, $data] ) );
            }
        }
        return html.toString();
    };

    gp.templates.footerCellContent.$inject = ['$data', '$column'];

    gp.templates.footerTable = function ( $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<table class="table" cellpadding="0" cellspacing="0">' )
            .add( $injector.exec( 'footer' ) )
            .add( '</table>' );
        return html.toString();
    };

    gp.templates.footerTable.$inject = ['$injector'];

    gp.templates.formGroup = function ( model ) {
        var template = '<div class="form-group {{editclass}}"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
        return gp.supplant.call( this, template, model );
    };

    gp.templates.header = function ( $columns, $config, $injector ) {
        // depending on whether or not fixedheaders has been specified
        // this template is rendered either in a table by itself or inside the main table
        var html = new gp.StringBuilder();
        html.add( '<thead><tr>' );
        $columns.forEach( function ( col ) {
            html.add( $injector.setResource( '$column', col ).exec( 'headerCell' ) );
        } );
        html.add( '</tr></thead>' );
        return html.toString();
    };

    gp.templates.header.$inject = ['$columns', '$config', '$injector'];

    gp.templates.headerCell = function ( $column, $config, $injector ) {
        var self = this,
            html = new gp.StringBuilder(),
            sort = '';

        if ( $config.sorting ) {
            // if sort isn't specified, use the field
            sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
        }
        else {
            // only provide sorting where it is explicitly specified
            if ( gp.hasValue( $column.sort ) ) {
                sort = gp.escapeHTML( $column.sort );
            }
        }

        html.add( '<th class="header-cell ' + ( $column.headerclass || '' ) + '"' );

        if ( gp.hasValue( sort ) ) {
            html.add( ' data-sort="' + sort + '"' );
        }

        html.add( '>' );
        html.add( $injector.exec( 'headerCellContent' ) );
        html.add( '</th>' );

        return html.toString();
    };

    gp.templates.headerCell.$inject = ['$column', '$config', '$injector'];

    gp.templates.headerCellContent = function ( $column, $config ) {

        var self = this,
            html = new gp.StringBuilder(),
            sort = '';

        if ( $config.sorting ) {
            // if sort isn't specified, use the field
            sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
        }
        else {
            // only provide sorting where it is explicitly specified
            if ( gp.hasValue( $column.sort ) ) {
                sort = gp.escapeHTML( $column.sort );
            }
        }

        // check for a template
        if ( $column.headertemplate ) {
            if ( typeof ( $column.headertemplate ) === 'function' ) {
                html.add( gp.applyFunc( $column.headertemplate, self, [$column] ) );
            }
            else {
                html.add( gp.supplant.call( self, $column.headertemplate, $column, [$column] ) );
            }
        }
        else if ( !gp.isNullOrEmpty( sort ) ) {
            html.add( '<a href="javascript:void(0);" class="table-sort" value="sort" data-sort="' )
                .escape( sort )
                .add( '">' )
                .escape( gp.coalesce( [$column.header, $column.field, sort] ) )
                .add( '<span class="glyphicon"></span>' )
                .add( '</a>' );
        }
        else {
            html.escape( gp.coalesce( [$column.header, $column.field, ''] ) );
        }

        return html.toString();
    };

    gp.templates.headerCellContent.$inject = ['$column', '$config'];

    gp.templates.input = function ( model ) {
        var obj = {
            type: ( model.type == 'boolean' ? 'checkbox' : ( model.type == 'number' ? 'number' : 'text' ) ),
            name: model.name,
            value: ( model.type == 'boolean' ? 'true' : ( model.type == 'date' ? gp.formatter.format( model.value, 'YYYY-MM-DD' ) : gp.escapeHTML( model.value ) ) ),
            checked: ( model.type == 'boolean' && model.value ? ' checked' : '' ),
            // Don't bother with the date input type.
            // Indicate the type using data-type attribute so a custom date picker can be used.
            // This sidesteps the problem of polyfilling browsers that don't support the date input type
            // and provides a more consistent experience across browsers.
            dataType: ( /^date/.test( model.type ) ? ' data-type="date"' : '' ),
            required: ( model.required ? ' required' : '' )
        };

        var html = gp.supplant.call( this, '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{{dataType}}}{{checked}}{{required}} />', obj );

        if ( model.required ) {
            html += '<span class="required"></span>';
        }

        return html;
    };

    gp.templates.pagerBar = function ( $pageModel ) {
        var pageModel = gp.shallowCopy( $pageModel ),
            html = new gp.StringBuilder();

        pageModel.IsFirstPage = pageModel.page === 1;
        pageModel.IsLastPage = pageModel.page === pageModel.pagecount;
        pageModel.HasPages = pageModel.pagecount > 1;
        pageModel.PreviousPage = pageModel.page === 1 ? 1 : pageModel.page - 1;
        pageModel.NextPage = pageModel.page === pageModel.pagecount ? pageModel.pagecount : pageModel.page + 1;

        pageModel.firstPageClass = ( pageModel.IsFirstPage ? 'disabled' : '' );
        pageModel.lastPageClass = ( pageModel.IsLastPage ? 'disabled' : '' );

        if ( pageModel.HasPages ) {
            html.add( '<div class="btn-group">' )
                .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
                .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
                .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '</div>' )
                .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
                .add( '<span class="page-count"> of {{pagecount}}</span>' )
                .add( '<div class="btn-group">' )
                .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
                .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{pagecount}}">' )
                .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '</div>' );
        }
        return gp.supplant.call( this, html.toString(), pageModel );
    };

    gp.templates.pagerBar.$inject = ['$pageModel'];

    gp.templates.tableBody = function ( $config, $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<table class="table" cellpadding="0" cellspacing="0">' );
        if ( !$config.fixedheaders ) {
            html.add( $injector.exec( 'header' ) );
        }
        html.add( '<tbody>' )
            .add( $injector.exec( 'tableRows' ) )
            .add( '</tbody>' );
        if ( $config.hasFooter && !$config.fixedfooters ) {
            html.add( $injector.exec( 'footer' ) );
        }
        html.add( '</table>' );
        return html.toString();
    };

    gp.templates.tableBody.$inject = ['$config', '$injector'];

    gp.templates.tableRow = function ( $injector, uid ) {
        var self = this,
            html = new gp.StringBuilder();
        html.add( '<tr data-uid="' )
            .add( uid )
            .add( '">' )
            .add( $injector.exec( 'tableRowCells' ) )
            .add( '</tr>' );
        return html.toString();
    };

    gp.templates.tableRow.$inject = ['$injector'];

    gp.templates.tableRowCell = function ( $column, $injector ) {
        var self = this,
            html = new gp.StringBuilder();

        html.add( '<td class="body-cell ' );
        if ( $column.commands ) {
            html.add( 'commands ' );
        }
        html.add( $column.bodyclass )
            .add( '">' )
            .add( $injector.exec( 'bodyCellContent' ) )
            .add( '</td>' );

        return html.toString();
    };

    gp.templates.tableRowCell.$inject = ['$column', '$injector'];

    gp.templates.tableRowCells = function ( $columns, $injector ) {
        var self = this,
            html = new gp.StringBuilder();
        $columns.forEach( function ( col ) {
            // set the current column for bodyCellContent template
            $injector.setResource( '$column', col );
            html.add( $injector.exec( 'tableRowCell' ) );
        } );
        return html.toString();
    };

    gp.templates.tableRowCells.$inject = ['$columns', '$injector'];

    gp.templates.tableRows = function ( $data, $map, $injector ) {
        var self = this,
            html = new gp.StringBuilder(),
            uid;
        if ( !$map ) {
            $map = new gp.DataMap();
            $injector.setResource( '$map', $map );
        }
        if ( $data == null ) return '';
        $data.forEach( function ( dataItem ) {
            // set the current data item on the injector
            $injector.setResource( '$dataItem', dataItem );
            // assign a uid to the dataItem, pass it to the tableRow template
            uid = $map.assign( dataItem );
            html.add( $injector.exec( 'tableRow', uid ) );
        } );
        return html.toString();
    };

    gp.templates.tableRows.$inject = ['$data', '$map', '$injector'];

    gp.templates.toolbar = function ( $config, $injector ) {
        var html = new gp.StringBuilder();

        if ( $config.search ) {
            html.add( '<div class="input-group gridponent-searchbox">' )
                .add( '<input type="text" name="search" class="form-control" placeholder="Search...">' )
                .add( '<span class="input-group-btn">' )
                .add( $injector.exec( 'button', {
                    btnClass: 'btn-default',
                    value: 'search',
                    glyphicon: 'glyphicon-search'
                } ) )
                .add( '</span>' )
                .add( '</div>' );
        }
        if ( $config.create ) {
            html.add( $injector.exec( 'button',
                {
                    btnClass: 'btn-default',
                    value: 'AddRow',
                    glyphicon: 'glyphicon-plus',
                    text: 'Add'
                } ) );
        }

        return html.toString();
    };

    gp.templates.toolbar.$inject = ['$config', '$injector'];
    /***************\
       UpdateModel
    \***************/
    gp.UpdateModel = function ( dataItem, validationErrors ) {

        this.dataItem = dataItem;
        this.errors = validationErrors;
        this.original = gp.shallowCopy( dataItem );

    };
    /***************\
       utilities
    \***************/
    ( function ( gp ) {

        gp.applyFunc = function ( callback, context, args, error ) {
            if ( typeof callback !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            try {
                if ( args == undefined ) {
                    return callback.call( context );
                }
                else {
                    args = Array.isArray( args ) ? args : [args];
                    return callback.apply( context, args );
                }
            }
            catch ( e ) {
                error = error || gp.error;
                gp.applyFunc( error, context, e );
            }
        };

        gp.camelize = function ( str ) {
            if ( gp.isNullOrEmpty( str ) ) return str;
            return str
                .replace( /[A-Z]([A-Z]+)/g, function ( _, c ) {
                    return _ ? _.substr( 0, 1 ) + c.toLowerCase() : '';
                } )
                .replace( /[-_](\w)/g, function ( _, c ) {
                    return c ? c.toUpperCase() : '';
                } )
                .replace( /^([A-Z])/, function ( _, c ) {
                    return c ? c.toLowerCase() : '';
                } );
        };

        gp.coalesce = function ( array ) {
            if ( gp.isNullOrEmpty( array ) ) return array;

            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
                    return array[i];
                }
            }

            return array[array.length - 1];
        };

        var FP = Function.prototype;

        var callbind = FP.bind
           ? FP.bind.bind( FP.call )
           : ( function ( call ) {
               return function ( func ) {
                   return function () {
                       return call.apply( func, arguments );
                   };
               };
           }( FP.call ) );

        var uids = {};
        var slice = callbind( ''.slice );
        var zero = 0;
        var numberToString = callbind( zero.toString );

        gp.createUID = function () {
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        };

        gp.disable = function ( elem, seconds ) {
            $( elem ).attr( 'disabled', 'disabled' ).addClass( 'disabled busy' );
            if ( typeof seconds == 'number' && seconds > 0 ) {
                setTimeout( function () {
                    gp.enable( elem );
                }, seconds * 1000 );
            }
        };

        gp.enable = function ( elem ) {
            $( elem ).removeAttr( 'disabled' ).removeClass( 'disabled busy' );
        };

        var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
        var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];

        gp.escapeHTML = function ( obj ) {
            if ( typeof obj !== 'string' ) {
                return obj;
            }
            chars.forEach( function ( char, i ) {
                obj = obj.replace( char, escaped[i] );
            } );
            return obj;
        };

        gp.formatter = new gp.Formatter();

        gp.getAttributes = function ( node ) {
            var config = {}, name, attr, attrs = $( node )[0].attributes;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = attr.name.toLowerCase().replace( '-', '' );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
            return config;
        };

        gp.getColumnByField = function ( columns, field ) {
            var col = columns.filter( function ( c ) { return c.field === field || c.sort === field } );
            return col.length ? col[0] : null;
        };

        gp.getCommand = function ( columns, name ) {
            // find by value
            var allCmds = [];
            columns.forEach( function ( col ) {
                if ( Array.isArray( col.commands ) ) {
                    allCmds = allCmds.concat( col.commands );
                }
            } );

            var cmd = allCmds.filter( function ( cmd ) {
                return cmd.value === name;
            } );

            if ( cmd.length > 0 ) return cmd[0];
        };

        gp.getDefaultValue = function ( type ) {
            switch ( type ) {
                case 'number':
                    return 0;
                case 'boolean':
                    return false;
                case 'date':
                default:
                    return null;
            }
        };

        gp.getFormattedValue = function ( row, col, escapeHTML ) {
            var type = ( col.Type || '' ).toLowerCase();
            // if type equals function, col.field is the function
            var val = ( type === 'function' ? col.field( row ) : row[col.field] );

            if ( /^(date|datestring|timestamp)$/.test( type ) ) {
                return gp.formatter.format( val, col.format );
            }
            if ( /^(number|function)$/.test( type ) && col.format ) {
                return gp.formatter.format( val, col.format );
            }
            // if there's no type and there's a format and val is numeric then parse and format
            if ( type === '' && col.format && /^(?:\d*\.)?\d+$/.test( val ) ) {
                return gp.formatter.format( parseFloat( val ), col.format );
            }
            if ( type === 'string' && escapeHTML ) {
                return gp.escapeHTML( val );
            }
            return val;
        };

        gp.getObjectAtPath = function ( path, root ) {
            if ( typeof path !== 'string' ) return path;

            // o is our placeholder
            var o = root || window,
                segment;

            path = path.match( gp.rexp.splitPath );

            if ( path[0] === 'window' ) path = path.splice( 1 );

            for ( var i = 0; i < path.length; i++ ) {
                // is this segment an array index?
                segment = path[i];
                if ( gp.rexp.indexer.test( segment ) ) {
                    // convert to int
                    segment = parseInt( /\d+/.exec( segment ) );
                }
                else if ( gp.rexp.quoted.test( segment ) ) {
                    segment = segment.slice( 1, -1 );
                }

                o = o[segment];

                if ( o === undefined ) return;
            }

            return o;
        };

        gp.getTableRow = function ( map, dataItem, node ) {
            var uid = map.getUid( dataItem );
            if ( uid == -1 ) return;
            return $( node ).find( 'tr[data-uid="' + uid + '"]' );
        };

        gp.getType = function ( a ) {
            if ( a === null || a === undefined ) {
                return a;
            }
            if ( a instanceof Date ) {
                return 'date';
            }
            if ( typeof ( a ) === 'string' ) {
                if ( gp.rexp.iso8601.test( a ) ) {
                    return 'datestring';
                }
                if ( gp.rexp.timestamp.test( a ) ) {
                    return 'timestamp';
                }
            }
            if ( Array.isArray( a ) ) {
                return 'array';
            }
            // number string boolean function object
            return typeof ( a );
        };

        gp.hasPositiveWidth = function ( nodes ) {
            if ( gp.isNullOrEmpty( nodes ) ) return false;
            for ( var i = 0; i < nodes.length; i++ ) {
                if ( nodes[i].offsetWidth > 0 ) return true;
            }
            return false;
        };

        gp.hasValue = function ( val ) {
            return val !== undefined && val !== null;
        };

        gp.isNullOrEmpty = function ( val ) {
            // if a string or array is passed, it'll be tested for both null and zero length
            // if any other data type is passed (no length property), it'll only be tested for null
            return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
        };

        gp.resolveTypes = function ( config ) {
            var field,
                val,
                hasData = config && config.pageModel && config.pageModel.data && config.pageModel.data.length;

            config.columns.forEach( function ( col ) {
                if ( gp.hasValue( col.Type ) ) return;
                field = gp.hasValue( col.field ) ? col.field : col.sort;
                if ( gp.isNullOrEmpty( field ) ) return;
                if ( typeof field === 'function' ) {
                    // don't execute the function here to find the type
                    // it should only be executed once by getFormattedValue
                    col.Type = 'function';
                    return;
                }
                // give priority to the model, unless it contains a function
                if ( config.model ) {
                    if ( gp.hasValue( config.model[field] ) && gp.getType( config.model[field] ) !== 'function' ) {
                        col.Type = gp.getType( config.model[field] );
                    }
                }
                if ( !gp.hasValue( col.Type ) && hasData ) {
                    // if we haven't found a value after 25 iterations, give up
                    for ( var i = 0; i < config.pageModel.data.length && i < 25 ; i++ ) {
                        val = config.pageModel.data[i][field];
                        if ( val !== null ) {
                            col.Type = gp.getType( val );
                            break;
                        }
                    }
                }
            } );
        };


        gp.rexp = {
            splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
            indexer: /\[\d+\]/,
            iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
            timestamp: /\/Date\((\d+)\)\//,
            quoted: /^['"].+['"]$/,
            trueFalse: /true|false/i,
            json: /^\{.*\}$|^\[.*\]$/,
            copyable: /^(object|date|array|function)$/
        };

        gp.shallowCopy = function ( from, to, camelize ) {
            to = to || {};
            // IE is more strict about what it will accept
            // as an argument to getOwnPropertyNames
            if ( !gp.rexp.copyable.test( gp.getType( from ) ) ) return to;
            var desc, p, props = Object.getOwnPropertyNames( from );
            props.forEach( function ( prop ) {
                p = camelize ? gp.camelize( prop ) : prop;
                if ( to.hasOwnProperty( prop ) ) {
                    // check for a read-only property
                    desc = Object.getOwnPropertyDescriptor( to, prop );
                    if ( !desc.writable ) return;
                }
                if ( typeof from[prop] === 'function' ) {
                    to[p] = from[prop]();
                }
                else {
                    to[p] = from[prop];
                }
            } );
            return to;
        };

        gp.supplant = function ( str, o, args ) {
            var self = this, types = /^(string|number|boolean)$/, r;
            // raw: 3 curly braces
            str = str.replace( /{{{([^{}]*)}}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    if ( types.test( typeof r ) ) return r;
                    // models can contain functions
                    if ( typeof r === 'function' ) return gp.applyFunc( r, self, args );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.applyFunc( r, self, args ) : '';
                }
            )
            // escape HTML: 2 curly braces
            return str.replace( /{{([^{}]*)}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    if ( types.test( typeof r ) ) return gp.escapeHTML( r );
                    // models can contain functions
                    if ( typeof r === 'function' ) return gp.escapeHTML( gp.applyFunc( r, self, args ) );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.escapeHTML( gp.applyFunc( r, self, args ) ) : '';
                }
            );
        };

        // logging
        gp.log = ( window.console ? window.console.log.bind( window.console ) : function () { } );
        gp.error = function ( e ) {
            if ( console && console.error ) {
                console.error( e );
            }
        };

    } )( gridponent );
    // check for web component support
    if ( document.registerElement ) {

        gp.Gridponent = Object.create( HTMLElement.prototype );

        gp.Gridponent.createdCallback = function () {
            var init = new gp.Initializer( this );
            $( init.initialize.bind( init ) );
        };

        gp.Gridponent.detachedCallback = function () {
            var tbl = this.querySelector( '.table-container' );
            if ( tbl && tbl.api ) tbl.api.dispose();
        };

        document.registerElement( 'grid-ponent', {
            prototype: gp.Gridponent
        } );
    }
    else {
        // no web component support
        // provide a static function to initialize grid-ponent elements manually
        gp.initialize = function ( root ) {
            root = $( root || document )[0];
            // jQuery stalls here, so don't use it
            var nodes = root.querySelectorAll( 'grid-ponent' );
            for ( var i = 0; i < nodes.length; i++ ) {
                new gp.Initializer( nodes[i] ).initialize();
            }
        };

        $( function () {
            gp.initialize();
        } );
    }

} )( gridponent );

