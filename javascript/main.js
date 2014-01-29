$(document).ready(function() {
  set_active_navbar_tab();
});

function set_active_navbar_tab() {
  $('ul.nav > li > a[href="' + document.location.pathname + '"]').parent().addClass('active');
}
