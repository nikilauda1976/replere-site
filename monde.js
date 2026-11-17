// Le premier écran : on touche un besoin, le paysage, l'humeur de Souffle et la phrase changent.
// Sans JavaScript, la page reste sur « Après l'effort » et tout se lit.
(function () {
  var monde = document.querySelector('.monde');
  if (!monde) return;
  var phrase = monde.querySelector('.monde-phrase');
  var boutons = monde.querySelectorAll('.monde-besoins button');
  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      boutons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      monde.dataset.monde = b.dataset.monde;
      monde.dataset.humeur = b.dataset.humeur;
      phrase.textContent = b.dataset.phrase;
    });
  });
})();
