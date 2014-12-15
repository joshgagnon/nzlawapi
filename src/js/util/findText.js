"user strict";

function findText(root, reg, callback){
  textNodesUnder(root).forEach(findWords);

  function textNodesUnder(root){
    var n,a=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false);
    while(n=w.nextNode()) a.push(n);
    return a;
  }
  function findWords(n){
    var result;
    while((result = reg.exec(n.nodeValue)) !== null) {
    var after = n.splitText(reg.lastIndex);
     var highlighted = n.splitText(result.index);
      var span = callback(highlighted);
      after.parentNode.insertBefore(span,after);
    }
  }
}


module.exports = findText;