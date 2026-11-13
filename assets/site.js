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
/* Formulaires.
   Si une clé Web3Forms est renseignée ci-dessous, les messages sont envoyés directement
   à l'association (le visiteur n'a rien d'autre à faire). Sinon, ou en cas d'échec,
   le site ouvre un e-mail prérempli vers l'adresse de l'association. */
var WEB3FORMS_KEY = '';
document.querySelectorAll('form[data-mail]').forEach(function(form){
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var titres={newsletter:"Inscription à la lettre d'information",contact:'Message depuis le site',engagement:'Je veux agir avec AFLADEGT'};
    var sujet=titres[form.getAttribute('name')]||'Message depuis le site';
    var lignes=[];
    form.querySelectorAll('input,select,textarea').forEach(function(el){
      if(!el.name||el.type==='hidden'||el.type==='submit')return;
      if((el.type==='checkbox'||el.type==='radio')&&!el.checked)return;
      var lab=form.querySelector('label[for="'+el.id+'"]');
      var nom=(lab&&lab.firstChild?lab.firstChild.textContent:el.getAttribute('aria-label')||el.name).trim();
      if(el.value.trim())lignes.push(nom+' : '+el.value.trim());
    });
    function parMail(){
      window.location.href='mailto:'+form.getAttribute('data-mail')+'?subject='+encodeURIComponent(sujet)+'&body='+encodeURIComponent(lignes.join('\n'));
      setTimeout(function(){window.location.href='merci.html'},1200);
    }
    if(!WEB3FORMS_KEY){parMail();return;}
    var btn=form.querySelector('button[type=submit]');
    if(btn){btn.disabled=true;btn.dataset.t=btn.textContent;btn.textContent='Envoi…';}
    var data={access_key:WEB3FORMS_KEY,subject:'[Site AFLADEGT] '+sujet,from_name:'Site AFLADEGT',message:lignes.join('\n')};
    fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)})
      .then(function(r){return r.json();})
      .then(function(j){ if(j&&j.success){window.location.href='merci.html';} else {throw new Error('refus');} })
      .catch(function(){ if(btn){btn.disabled=false;btn.textContent=btn.dataset.t;} parMail(); });
  });
});
