const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_BASE_URL",
    description:
      "Your store URL, should be updated to where you are hosting your storefront.",
  },
  {
    key: "NEXT_PUBLIC_DEFAULT_REGION",
    description:
      'Your preferred default region. When middleware cannot determine the user region from the "x-vercel-country" header, the default region will be used. ISO-2 lowercase format.',
  },
]

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    process.exit(1)
  }
}

module.exports = checkEnvVariables
