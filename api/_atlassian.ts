import axios from 'axios';

export async function getCloudId(accessToken: string): Promise<string> {
  const response = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const resources = response.data as { id: string; url: string }[];
  if (!resources || resources.length === 0) {
    throw new Error('No accessible Jira resources found for this account');
  }
  return resources[0].id;
}
