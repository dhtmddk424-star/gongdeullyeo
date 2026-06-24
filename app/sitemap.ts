import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://gonglog.vercel.app'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/planner`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/community`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/store`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/subscribe`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]
}
