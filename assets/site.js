document.querySelectorAll('.copy').forEach(function(b){
  b.addEventListener('click',function(){
    var v=b.getAttribute('data-v'),t=b.textContent;
    function done(){b.textContent='Copié';setTimeout(function(){b.textContent=t},1600)}
    function pick(){var s=b.previousElementSibling,r=document.createRange();r.selectNodeContents(s);var w=getSelection();w.removeAllRanges();w.addRange(r)}
    try{navigator.clipboard.writeText(v).then(done,pick)}catch(e){pick()}
  });
});
document.querySelectorAll('.burger .panel a').forEach(function(a){a.addEventListener('click',function(){a.closest('details').open=false})});
var fl=document.querySelector('.filters');
if(fl){fl.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  fl.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
  var f=b.getAttribute('data-f');
  document.querySelectorAll('#news-list .card').forEach(function(c){c.hidden=!(f==='*'||c.getAttribute('data-cat')===f)});
});}
/* Formulaires : ouvre un e-mail prérempli vers l'association, puis la page de remerciement */
document.querySelectorAll('form[data-mail]').forEach(function(form){
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var titres={newsletter:"Inscription à la lettre d'information",contact:'Message depuis le site',engagement:'Je veux agir avec AFLADEGT'};
    var lignes=[];
    form.querySelectorAll('input,select,textarea').forEach(function(el){
      if(!el.name||el.type==='hidden'||el.type==='submit')return;
      if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;
      var lab=form.querySelector('label[for="'+el.id+'"]');
      var nom=(lab&&lab.firstChild?lab.firstChild.textContent:el.getAttribute('aria-label')||el.name).trim();
      if(el.value.trim())lignes.push(nom+' : '+el.value.trim());
    });
    var sujet=titres[form.getAttribute('name')]||'Message depuis le site';
    window.location.href='mailto:'+form.getAttribute('data-mail')+'?subject='+encodeURIComponent(sujet)+'&body='+encodeURIComponent(lignes.join('\n'));
    setTimeout(function(){window.location.href='merci.html'},1200);
  });
});
