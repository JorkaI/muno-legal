// The project this page reads: muno's PRODUCTION database.
//
// The key is the publishable one the app itself ships, public by design. It opens
// nothing on its own: the statistics answer only an account on the readers' list
// (`analytics_readers`, migration 033 in the app's repository), checked by the
// database on every call.
window.MUNO_STATS = {
  label: 'Прод',
  url: 'https://utcgbxawccfyygpcczmv.supabase.co',
  key: 'sb_publishable_KpZLMXyXBtlMoFpVIi-eJw_eXP-feFG',
};
