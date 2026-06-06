# Background mailer job.
class Mailer
  def initialize
    @api_key = ENV.fetch("SENDGRID_API_KEY")
    @database_url = ENV["DATABASE_URL"]
  end

  def deliver(message)
    # ... send `message` using @api_key ...
    message
  end
end
