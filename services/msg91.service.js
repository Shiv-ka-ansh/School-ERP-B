const axios = require('axios');

exports.sendFlowSms = async ({ mobiles, templateId, variables = {}, sender = 'SMPSJP' }) => {
  const payload = {
    template_id: templateId,
    sender,
    short_url: 0,
    mobiles,
    ...variables
  };

  const response = await axios.post('https://api.msg91.com/api/v5/flow/', payload, {
    headers: {
      authkey: process.env.MSG91_AUTH_KEY,
      'content-type': 'application/json'
    },
    timeout: 15000
  });

  return response.data;
};
