"use strict";

var Reflux = require('reflux');
var Actions = require('../actions/Actions');
var _ = require('lodash');
var Immutable = require('immutable');


module.exports = Reflux.createStore({
    listenables: Actions,
    init: function(){
        this.browser = this.getInitialState().browser;
    },
    getInitialState: function(){
        return {
            browser: Immutable.fromJS({
            underlines: true,
            notes: true,
            split_mode: false,
            print_mode: false,
            show_sidebar: true,
        })};
    },
    update: function(){
        this.trigger({browser: this.browser});
    },
    onToggleUnderlines: function(){
        this.browser = this.browser.set('underlines', !this.browser.get('underlines'));
        this.update();
    },
    onToggleNotes: function(){
        this.browser = this.browser.set('notes', !this.browser.get('notes'));
        this.update();
    },
    onDeactivateSplitMode: function(){
        if(this.browser.get('split_mode')){
            this.onToggleSplitMode();
        }
    },
    onToggleSplitMode: function(){
        this.browser = this.browser.set('split_mode', !this.browser.get('split_mode'));
        this.update();
    },
    onActivatePrintMode: function(){
        if(!this.browser.get('print_mode')){
            this.onTogglePrintMode();
        }
    },
    onDeactivatePrintMode: function(){
        if(this.browser.get('print_mode')){
            this.onTogglePrintMode();
        }
    },
    onTogglePrintMode: function(){
        this.browser = this.browser.set('print_mode', !this.browser.get('print_mode'));
        this.update();
    },
    onToggleSidebar: function(){
        this.browser = this.browser.set('show_sidebar', !this.browser.get('show_sidebar'));
        this.update();
    },
    onOpenPageDialog: function(){
        this.browser = this.browser.set('page_dialog', true);
        this.update();
    },
    onClosePageDialog: function(){
        this.browser = this.browser.set('page_dialog', false);
        this.update();
    },
    onSetState: function(state){
        if(state.get('browser')){
            this.browser = state.get('browser');
        }
        this.update();
    },
    onNewPage: function(){
        if(this.browser.get('print_mode') && !this.browser.get('split_mode')){
            this.onToggleSplitMode();
        }
    },
    onReset: function(){
        this.browser = this.browser.set('split_mode', false).set('print_mode', false);
        this.update();
    }
});