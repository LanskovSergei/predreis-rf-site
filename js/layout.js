(function ($) {
  'use strict';

  $(function () {
    var $toggle = $('.pr-footer__search-toggle');
    var $form = $('.pr-footer__search-form');

    $toggle.on('click', function () {
      var isOpen = $form.hasClass('is-open');
      $form.toggleClass('is-open', !isOpen);
      $(this).attr('aria-expanded', !isOpen);
      if (!isOpen) {
        $form.find('input[type="text"]').focus();
      }
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.pr-footer__search-wrap').length) {
        $form.removeClass('is-open');
        $toggle.attr('aria-expanded', 'false');
      }
    });

    $form.on('submit', function () {
      var query = $.trim($form.find('input[type="text"]').val());
      if (!query) {
        return false;
      }
      window.open(
        'https://yandex.ru/search/?text=' + encodeURIComponent('site:предрейс.рф ' + query),
        '_blank'
      );
      return false;
    });
  });
}(jQuery));
