var Settings = {
  token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImlzcyI6IjBjNGYyNjhmLTZjMmYtNDM5Zi1iMTI3LTMzYTcwZGY2MmMwZSIsInR5cGUiOiJ1c2VyIiwidXNlciI6Ik1hcmlhIFRlc3QgTWlrYSIsInVzZXJfaWQiOiJlYzQxZDhjMi1jMDJjLTRiZjktYjllYy0zYTRhMmY3MDhkMzMiLCJ0ZW5hbnRfaWQiOiIwYzRmMjY4Zi02YzJmLTQzOWYtYjEyNy0zM2E3MGRmNjJjMGUifQ.SpmhvgXw0fbjRhebvqf9L_8II4V6PV-4Xe4DpEs39Zo",
  basepath: "/wayfinding", // in case of change it's required to change that also at ./src/environments and ./angular.json files
  port: "6001", // in case of change it's required to change that also at ./src/environments
  proximi_api: 'https://api.proximi.fi',
  geo_version: 'v5'
};

module.exports = Settings;
