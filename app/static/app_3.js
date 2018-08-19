function SQLHistoryStore() {
    this.history = [];
    this.lastPointer = 0;
}

SQLHistoryStore.prototype.store = function(sql) {
    var newSize = this.history.unshift(sql);
    if (newSize > 10) {
        this.history.pop();
    }
}

SQLHistoryStore.prototype.next = function() {
    var sql = this.fetch_next();
    if (sql.length > 0) {
        window.editor.setValue(sql);
    }
}

SQLHistoryStore.prototype.prev = function() {
    var sql = this.fetch_prev();
    if (sql.length > 0) {
        window.editor.setValue(sql);
    }
}

SQLHistoryStore.prototype.fetch_next = function() {
    if (this.lastPointer < this.history.length - 1) {
        this.lastPointer = this.lastPointer + 1;
        return this.history[this.lastPointer];
    } else {
        return "";
    }
}

SQLHistoryStore.prototype.fetch_prev = function() {
    if (this.lastPointer > 0) {
        this.lastPointer = this.lastPointer - 1;
        return this.history[this.lastPointer];
    } else {
        return "";
    }
}

SQLHistoryStore.prototype.search = function() {
    var term = window.editor.getValue();
    var i;
    for (i = 0; i < this.history.length; i++) {
        if (this.history[i].toLowerCase().indexOf(term.toLowerCase()) > -1) {
            this.lastPointer = i;
            window.editor.setValue(this.history[this.lastPointer]);
        }
    }       
}


pushMessage = function(msg, type, icon, stay) {
    var toastshow = app.$toasted.show(msg, { 
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
    if (!stay) {
        toastshow.goAway(5000);
    }
    return toastshow;
}

pushError = function(error) {
    if (error.response.data.message) {
        pushMessage(error.response.data.message, 'error', 'error', true);
    } else {
        pushMessage(error.message, 'error', 'error', true);
    }
}

pushSuccess = function(response) {
    pushMessage(response.data.message, 'success', 'thumb_up_alt');
}

Vue.use(Toasted);

Vue.filter('formatDate', function(value) {
    if (value) {
        var date = new Date(value);
        return date.toLocaleString();
    }
});

var sqlHistory = new SQLHistoryStore();

var app = new Vue({
    el: '#wrap',
    data: {
        sqls: 'SELECT * FROM ABS.TVERSION;',
        last_result: []
    },

    computed: {
        last_result_columns: function() {
            if (this.last_result.length > 0) {
                return Object.keys(this.last_result[0]);
            } else return [];
        },

        last_result_values: function() {
            return this.last_result.map(function(result) { 
                // IE 11 workaround: https://stackoverflow.com/questions/42830257/alternative-version-for-object-values
                return Object.keys(result).map(function(key) {
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
            if (e.ctrlKey && e.keyCode === 38) {
                sqlHistory.next();
            } else if (e.ctrlKey  &&  e.keyCode === 40) {
                sqlHistory.prev();
            } else if (e.ctrlKey && e.keyCode === 89) {
                sqlHistory.search();
            } else if (e.ctrlKey &&  e.keyCode === 13) {
                this.execute();
            } else if (e.ctrlKey) {
                console.log(e.keyCode);
            };
        },

        execute: function() {
            this.last_result = [];
            var sqls = window.editor.getValue();
            sqlHistory.store(sqls);
            var toast = pushMessage('Executing queries. Please wait.', 'info', 'hourglass_empty');
            window.editor.focus();
            return new Promise(
                    function (resolve, reject) {
                        axios.post('/execute', {sqls: sqls})
                        .then(resolve)
                        .catch(reject);
                    }
                ).then(function(response) {
                    toast.goAway(800);
                    app.last_result = response.data.result;
                    pushSuccess(response);
                }).catch(function(error) {
                    // toast.goAway(800);
                    pushError(error)
                });
        }
    }

})



