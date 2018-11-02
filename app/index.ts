import Vue from 'vue'
import * as codemirror from 'codemirror'
import "codemirror/mode/sql/sql"
import "codemirror/addon/hint/sql-hint"
import "codemirror/addon/hint/show-hint"
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import Toasted from 'vue-toasted';
import axios from 'axios';

const MAX_HISTORY_SIZE = 10;

class ValidationDisplay {

  success(toastr, msg:string) {
    return this.showMessage(toastr, msg, 'success', 'thumb_up_alt', false);
  }

  error(toastr, msg:string) {
    return this.showMessage(toastr, msg, 'error', 'error', true);
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

function addBookmarksToEditorAutoCompletion(provideList:Function) {
  var orig = codemirror.hint.sql;
  codemirror.hint.sql = function(cm) {
    var inner = orig(cm) || {from: cm.getCursor(), to: cm.getCursor(), list: []};
    inner.list.push.apply(inner.list, provideList());
    return inner;
  };
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

let bookmarks: Array<string> = [];

const app = new Vue({
  el: '#wrap',
  data: {
    sqls: 'SELECT * FROM SCHEMA.TABLE;',
    bookmarks: bookmarks,
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
    this.loadBookmarks();
    let bookmarks = this.bookmarks;
    addBookmarksToEditorAutoCompletion(function() {return bookmarks});
    this.loadConfiguration();
  },
  
  methods: {
    loadConfiguration() {
      axios.get('/config')
          .then(function (response) {
            (<any>window).editor.setValue(response.data['initial_query']);
            if ((<any>app).bookmarks.length == 0) {
              (<any>app).bookmarks = response.data['bookmarks'];
            }
          })

    },

    addBookmark: function() {
      this.bookmarks.push((<any>window).editor.getValue());
      this.saveBookmarks();
    },
    removeBookmark: function(index:number) {
      this.bookmarks.splice(index, 1);
      this.saveBookmarks();
    },
    useBookmark: function(index:number) {
      (<any>window).editor.setValue(this.bookmarks[index]);
    },
    saveBookmarks: function() {
      let state = JSON.stringify(this.bookmarks);
      localStorage.setItem('bookmarks', state);
    },
    loadBookmarks: function() {
      let state = localStorage.getItem('bookmarks');
      if (state != null) {
        this.bookmarks = JSON.parse(state);
      }
    },

    reset: () => {app.sqls = ''},
    shortcutHandler: function(e) {
      if (e.altKey && e.keyCode === 38) {
        sqlHistory.next();
      } else if (e.altKey  &&  e.keyCode === 40) {
          sqlHistory.prev();
      } else if (e.altKey &&  e.keyCode === 13) {
          this.execute();
      } else if (e.altKey &&  e.keyCode === 66) {
          this.addBookmark();
      } else if (e.altKey) {
          console.log(e.keyCode);
      };
  },

    execute: function() {
      let toast = validationDisplay.success((<any>app).$toasted, 'Executing query. This may take a while.');
      sqlHistory.store();
      
      let query = (<any>window).editor.getValue();
      axios.post('/execute', {query: query})
           .then(function (response) {
             toast.goAway();
             app.last_result = response.data.result;
             validationDisplay.success((<any>app).$toasted, response.data.message);
           })
           .catch(function (event) {
            toast.goAway();
            validationDisplay.error((<any>app).$toasted, event.response.data.message);
           })
    }
  }
});
