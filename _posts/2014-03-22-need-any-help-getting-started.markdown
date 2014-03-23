---
layout: post
title:  "Need any help getting started?"
description: "John Kelly goes over one of the most important aspects of a SAAS software company: The welcome email."
date:   2014-03-22 16:37:55
icon: fa-envelope
categories: jekyll update
---
The key to starting any successful business is to interact with potential customers as early and as often as you can without alienating them. Not only is it critical for sales, but early customers should drive what product you build based on their feedback. One tip that I've took to heart and that has paid huge dividends for my Zarlu and Release[Board] startups is to establish contact with a new sign up within 30 minutes of them filling out the sign up form.

Before I go into my exact process, I should mention that if you are currently not recording or getting notifications with a user's email when they sign up, stop whatever you are doing and add that feature. There are several free tools out there and if there is one piece of data you should be recording it should be who is using your software. It is important to think of each sign up as a sales lead. If you're not recording your sales leads, you are leaving money on the table!

If you have a technical background, implementing sign up notifications yourself is trivial and takes only a few minutes. Here's our Release[Board] code for sending a hipchat notification to our chat room when a user signs up:


#### send\_hipchat\_notification.rb
{% highlight ruby %}
class SendHipchatNotification
  include Interactor

  def perform
    HipchatNotificationWorker.perform_async("#{user.email} has signed up #{company.name}") unless Rails.env.development?
  end

  def setup
    context[:user] ||= nil
    context[:company] ||= nil
  end
end
{% endhighlight %}

#### hipchat\_notification\_worker.rb
{% highlight ruby %}
class HipchatNotificationWorker
  include Sidekiq::Worker

  def perform(message, color="green")
    client = HipChat::Client.new(ENV["HIPCHAT_API_TOKEN"])
    room = client[ENV["HIPCHAT_ROOM_ID"]]
    room.send('Release Board', message, color: color)
  end
end
{% endhighlight %}

With just the code presented above you can now be notified in near real time when a user signs up for your product. Now simply copy their email address into your email client and send them an email welcoming them to your product. I'd recommend A/B testing yourself how long you should wait but I like to wait 10-30 minutes before sending the email to give the customer a chance to explore the product. The optimal time would probably be to send the email at the exact time they log off, get confused, or go inactive, but I didn't explore those optimizations.

As a software engineer I try to automate whenever possible and I can say from experience that manually sending emails gets old fast. Again just like notifications, sending an automated welcome email is trivial. There are outside services but I think setting up a service will probably take longer than just doing it yourself. Here's the "time sink" of code:

#### registrations\_controller.rb
{% highlight ruby %}
class RegistrationsController < ApplicationController
  skip_before_action :authenticate
  skip_before_action :authenticate_paid

  def create
    @result = SignUp.perform(user_params)

    if @result.success?
      render json: @result.user, serializer: CurrentUserSerializer, status: :created
    else
      render json: { errors: @result.errors }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:register).permit(:email, :password, :password_confirmation, :first_name, :last_name, :company_name)
  end
end
{% endhighlight %}

#### sign\_up.rb
{% highlight ruby %}
class SignUp
  include Interactor::Organizer

  organize AddCompany, AddUser, IncrementSignInCount, SendHipchatNotification, SendWelcomeEmail
end
{% endhighlight %}

#### send\_welcome\_email.rb
{% highlight ruby %}
class SendWelcomeEmail
  include Interactor

  def perform
    @user = user
    NewAccountMailer.delay_for(30.minutes).welcome(@user.id)
    context[:user] = @user
  end

  def setup
    context[:user] ||= nil
  end
end
{% endhighlight %}

#### new\_account\_mailer.rb
{% highlight ruby %}
class NewAccountMailer < ActionMailer::Base
  default from: "John at Release Board <john@releaseboard.com>"

  def welcome(user_id)
    @user = User.find(user_id)

    mail(to: @user.email, subject: "Need any help getting started?")
    Rails.logger.info "New Account email Sent Via Mandrill"
  end
end
{% endhighlight %}

#### welcome.text.erb
{% highlight ruby %}
Hi <%= @user.first_name %>,

Thank you for participating in the Release[Board] Public Beta! 

Now that you've created an account, I wanted to reach out to see if you need any help getting started with Release[Board]. I'd be happy to answer any questions you may have or help you move your company's release process onto Release[Board].

As you use the app, I'd love to hear any ideas you have for improving Release[Board].

Cheers,

John Kelly
Co-Founder of Release[Board]
john@releaseboard.com
{% endhighlight %}

Now shift your focus to the two last code snippets `new_account_mailer.rb` and `welcome.html.erb`. One of the key aspects to point out is that I'm sending these welcome emails from john@releaseboard.com and not support or some other generic email address. My A/B testing has shown that sending from your actual personal account generates significantly more replies. In the same vein, I'm sending the email as plain text, and not as HTML. The welcome email is just a short personal email from my account. The rough and non corporate tone of the email will differentiate you from your more established competitors. How many big businesses give out to each new customer their owner's email and a short welcome message? The other key point is to keep your message short, sweet and under 5 sentences. Make your new customer feel welcomed, and open the direct channel between you and them.

This simple email has generated replies ranging from 1 or 2 sentences to 5-6 content full paragraphs from new signups, and the reply rate is terrific. As someone who has cold emailed leads in the past, I can tell you that the response rate is magnitudes better for this email. One last tip I'll leave you with is that I've seen some people report that adding the iPhone "Sent from my iPhone" message to your email will generate an even higher reply rate because it makes the email seem less automated. I decided to not to go that route myself, but it's something to consider and A/B test.
