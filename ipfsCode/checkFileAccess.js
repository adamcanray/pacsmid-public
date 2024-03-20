const checkFileAccess = async (accessionNumber, wallet) => {
  const url = `https://pacs-middleware-app-tzcpn.ondigitalocean.app/file/access-control-condition?accessionNumber=${accessionNumber}&wallet=${wallet}`;
  try {
    const response = await fetch(url).then((res) => res.json());
    console.log("response", response);
    return response.canAccess;
  } catch (e) {
    console.log("error", e);
  }
  return false;
};
