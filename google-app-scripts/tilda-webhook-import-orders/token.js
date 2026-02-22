function getApiToken() {
  return PropertiesService.getScriptProperties().getProperty("API_TOKEN");
}

function validateToken(data) {
  const token = data.apiKey;
  const validToken = getApiToken();

  if (!token || token !== validToken) {
    throw new Error("Unauthorized request");
  }
}
