import Vue from 'vue'
import * as codemirror from 'codemirror'
import "codemirror/mode/sql/sql"
import "codemirror/addon/hint/sql-hint"
import "codemirror/addon/hint/show-hint"
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'


window.onload = function() {
  var editor = document.getElementById("editor") as HTMLTextAreaElement;
  codemirror.fromTextArea(editor, {
          mode: 'text/x-mariadb',
          indentWithTabs: true,
          smartIndent: true,
          lineNumbers: true,
          matchBrackets : true,
          autofocus: true,
          extraKeys: {"Ctrl-Space": "autocomplete"}
      });
}

let user = "Jane User";


console.log(user);