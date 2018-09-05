import Vue from 'vue'
import * as codemirror from 'codemirror'
import "codemirror/mode/sql/sql"
import "codemirror/addon/hint/sql-hint"
import "codemirror/addon/hint/show-hint"
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import Toasted from 'vue-toasted';

const MAX_HISTORY_SIZE = 10;


class ValidationDisplay {

  success(toastr, msg:string) {
    return this.showMessage(toastr, msg, 'success', 'thumb_up_alt', false);
  }

  showMessage(toastr, msg:string, type:string, icon:string, keep:boolean) {
    let toast = toastr.show(msg, {
      theme: "outline", 
      position: "top-right",
      type: type,
      icon: icon,
      action : {
                 text : 'Close',
                 onClick : function(e, toastObject) {
                     toastObject.goAway(0);
                 }
               }
    });

    if (!keep) {
      toast.goAway(2000);
    }
    return toast;
  }
  
}

class SQLHistoryStore {
  
  history: Array<string> = [];
  lastPointer: number = 0;
  editor: any;
  
  setEditor(editor:any) {
    this.editor = editor;
  }
  
  store() {
    var sql = this.editor.getValue();
    var newSize = this.history.unshift(sql);
    if (newSize > MAX_HISTORY_SIZE) {
      this.history.pop();
    }
  }
  
  prev() {
    var sql = this.fetch_prev();
    if (sql.length > 0) {
      this.editor.setValue(sql);
    }
  }
  
  next() {
    var sql = this.fetch_next();
    if (sql.length > 0) {
      this.editor.setValue(sql);
    }
  }
  
  fetch_next() {
    if (this.lastPointer < this.history.length - 1) {
      this.lastPointer = this.lastPointer + 1;
      return this.history[this.lastPointer];
    } else {
      return "";
    }
  }
  
  fetch_prev() {
    if (this.lastPointer > 0) {
      this.lastPointer = this.lastPointer - 1;
      return this.history[this.lastPointer];
    } else {
      return "";
    }
  }
}

let sqlHistory = new SQLHistoryStore();
let validationDisplay = new ValidationDisplay();

window.onload = function () {
  
  var textarea = document.getElementById("editor_area") as HTMLTextAreaElement;
  (<any>window).editor = codemirror.fromTextArea(textarea, {
    mode: 'text/x-mariadb',
    indentWithTabs: true,
    smartIndent: true,
    lineNumbers: true,
    matchBrackets: true,
    autofocus: true,
    extraKeys: { "Ctrl-Space": "autocomplete" }
  });
  sqlHistory.setEditor((<any>window).editor);
}

Vue.filter('formatDate', function(value) {
  if (value) {
    var date = new Date(value);
    return date.toLocaleString();
  }
});

Vue.use(Toasted);

const app = new Vue({
  el: '#wrap',
  data: {
    sqls: 'SELECT * FROM SCHEMA.TABLE;',
    last_result: []
  },
  
  computed: {
    last_result_columns: function () {
      if (this.last_result.length > 0) {
        return Object.keys(this.last_result[0]);
      } else return [];
    },
    
    last_result_values: function () {
      return this.last_result.map(function (result) {
        // IE 11 workaround: https://stackoverflow.com/questions/42830257/alternative-version-for-object-values
        return Object.keys(result).map(function (key) {
          return result[key];
        });
      });
    }
  },

  created: function () {
    window.addEventListener('keyup', this.shortcutHandler);
  },

  methods: {        
    reset: function() {
        this.sqls = '';
    },

    shortcutHandler: function(e) {
      if (e.altKey && e.keyCode === 38) {
          sqlHistory.next();
      } else if (e.altKey  &&  e.keyCode === 40) {
          sqlHistory.prev();
      } else if (e.altKey &&  e.keyCode === 13) {
          this.execute();
      } else if (e.altKey) {
          console.log(e.keyCode);
      };
  },

    execute: function() {
      validationDisplay.success((<any>app).$toasted, 'Executing query. This may take a while.');
      sqlHistory.store();
    }
  }
});
