'use strict'
const sharp = require('sharp')
const AWS = require('aws-sdk')

const s3 = new AWS.S3()

const supportedSizes = ['1920', '1080', '720', '480', '320', '120', undefined]
module.exports.resize = async (event) => {
  try {
    const bucket = event.Records[0].s3.bucket.name
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
    const params = {
      Bucket: bucket,
      Key: key,
    }

    const file = await s3.getObject(params).promise()

    const options = [
      ...supportedSizes.map(s => ({ file, format: 'webp', size: s, key })),
      // ...supportedSizes.map(s => ({ file, format: 'png', size: s, key })), // Add this if we decide to support png
    ]
    await Promise.all(options.map(formatAndUpload))
  } catch (e) {
    console.error(e)
  }
}

async function formatAndUpload ({ file, format, size, key }) {
  let req = sharp(file.Body)

  if (size) req = req.resize({ width: parseInt(size), height: parseInt(size), options: { withoutEnlargement: true } })
  if (format) req = req.toFormat(format)
  const { data, info } = await req.toBuffer({ resolveWithObject: true })

  await s3.putObject({
    Bucket: 'pulfy-media',
    Key: `image/${size ? `${size}` : 'o'}/${key}`,
    // Key: `image/${size ? `${size}` : 'o'}/${key}.${format}`, // Use this instead if we decide to keep multiple formats
    Body: data,
    ContentType: 'image/' + info.format,
    Metadata: {
      original_key: key
    }
  }).promise()
}
