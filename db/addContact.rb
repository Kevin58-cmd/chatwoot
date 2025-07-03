# loading installation configs
GlobalConfig.clear_cache
ConfigLoader.new.process

## Seeds productions
if Rails.env.production?
  # Setup Onboarding flow
  Redis::Alfred.set(Redis::Alfred::CHATWOOT_INSTALLATION_ONBOARDING, true)
end

## Seeds for Local Development
unless Rails.env.production?

  # Enables creating additional accounts from dashboard
  installation_config = InstallationConfig.find_by(name: 'CREATE_NEW_ACCOUNT_FROM_DASHBOARD')
  installation_config.value = true
  installation_config.save!
  GlobalConfig.clear_cache

  user = User.find_or_initialize_by(email: 'john@acme.inc')
unless user.persisted?
  user.name = 'John'
  user.password = 'Password1!'
  user.type = 'SuperAdmin'
  user.skip_confirmation!
  user.save!
end

account = Account.find_or_create_by!(name: 'Acme Inc')
secondary_account = Account.find_or_create_by!(name: 'Acme Org')

AccountUser.find_or_create_by!(account_id: account.id, user_id: user.id, role: :administrator)
AccountUser.find_or_create_by!(account_id: secondary_account.id, user_id: user.id, role: :administrator)

  web_widget = Channel::WebWidget.find_or_create_by!(account: account, website_url: 'https://acme.inc')

  inbox = Inbox.find_or_create_by!(channel: web_widget, account: account, name: 'Acme Support')
  InboxMember.find_or_create_by!(user: user, inbox: inbox)

  (1..3).each do |i|
    email = "contact#{i}@example.com"
    contact = Contact.find_by(email: email)
    next if contact.present?

    contact_inbox = ContactInboxWithContactBuilder.new(
    source_id: SecureRandom.uuid,  # 用 UUID 避免 source_id 冲突
    inbox: inbox,
    hmac_verified: true,
    contact_attributes: {
      name: "Contact #{i}",
      email: email,
      phone_number: "+1000000#{i}"
    }
    ).perform

    conversation = Conversation.create!(
    account: account,
    inbox: inbox,
    status: :open,
    assignee: user,
    contact: contact_inbox.contact,
    contact_inbox: contact_inbox,
    additional_attributes: {}
    )

  Message.create!(
    content: "Hi, I am Contact #{i}. I need help with something.",
    account: account,
    inbox: inbox,
    conversation: conversation,
    sender: contact_inbox.contact,
    message_type: :incoming
  )

  Message.create!(
    content: "Thank you for reaching out, Contact #{i}. We'll get back to you shortly.",
    account: account,
    inbox: inbox,
    conversation: conversation,
    sender: user,
    message_type: :outgoing
  )

#   contact_inbox = ContactInboxWithContactBuilder.new(
#     source_id: user.id,
#     inbox: inbox,
#     hmac_verified: true,
#     contact_attributes: { name: 'jane', email: 'jane@example.com', phone_number: '+2320000' }
#   ).perform

#   conversation = Conversation.create!(
#     account: account,
#     inbox: inbox,
#     status: :open,
#     assignee: user,
#     contact: contact_inbox.contact,
#     contact_inbox: contact_inbox,
#     additional_attributes: {}
#   )

  # sample email collect
  Seeders::MessageSeeder.create_sample_email_collect_message conversation

  Message.create!(content: 'Hello', account: account, inbox: inbox, conversation: conversation, sender: contact_inbox.contact,
                  message_type: :incoming)

  # sample location message
  #
  location_message = Message.new(content: 'location', account: account, inbox: inbox, sender: contact_inbox.contact, conversation: conversation,
                                 message_type: :incoming)
  location_message.attachments.new(
    account_id: account.id,
    file_type: 'location',
    coordinates_lat: 37.7893768,
    coordinates_long: -122.3895553,
    fallback_title: "Bay Bridge, San Francisco, CA, USA #{i}"
  )
  location_message.save!

  # sample card
  Seeders::MessageSeeder.create_sample_cards_message conversation
  # input select
  Seeders::MessageSeeder.create_sample_input_select_message conversation
  # form
  Seeders::MessageSeeder.create_sample_form_message conversation
  # articles
  Seeders::MessageSeeder.create_sample_articles_message conversation
  # csat
  Seeders::MessageSeeder.create_sample_csat_collect_message conversation

  CannedResponse.create!(account: account, short_code: 'start', content: 'Hello welcome to chatwoot.')
end
