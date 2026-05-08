import client from './client'
export const verifyGST       = gstin => client.post('/onboarding/verify-gst', { gstin })
export const completeOnboard = data  => client.post('/onboarding/complete', data)
export const profileStatus   = ()    => client.get('/onboarding/profile-status')
export const buildFromLink   = link  => client.post('/onboarding/build-from-link', { link })
