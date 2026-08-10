window.BUILDSCOUT_CONFIG = {
  appName: "BuildScout",
  launchMarket: "Dallas–Fort Worth",
  mapCenter: [32.83, -97.05],
  mapZoom: 9,
   supabaseUrl: "https://fexdofuzoyvymmbtzvje.supabase.co",
  supabasePublishableKey:"sb_publishable_QOtqQZrbX7-RXuYuy7reeg_SFmN8bvc"

  sources: [
    {
      city: "Fort Worth",
      label: "Issued Building Permits",
      url: "https://www.fortworthtexas.gov/departments/development-services/permits/issued",
      mode: "CSV/GeoJSON import"
    },
    {
      city: "Arlington",
      label: "Public Permit Search",
      url: "https://ap.arlingtontx.gov/AP/sfjsp?btnclk=search&interviewID=PublicSearch",
      mode: "CSV import"
    },
    {
      city: "Dallas",
      label: "DallasNow",
      url: "https://dallascityhall.com/departments/sustainabledevelopment/Pages/DallasNow.aspx",
      mode: "future connector"
    }
  ]
};
