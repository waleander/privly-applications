/**
 * @fileOverview Manages the form interaction with remote servers.
 **/

/**
 * The callbacks assign the state of the application.
 *
 * This application can be placed into the following states:
 * 1. Pending Login Check: The app is currently requesting the CSRF
 *    token from the remote server. Callback=pendingLogin
 * 2. Failure to login: The user is not currently authenticated with the
 *    remote server. In this state the user is prompted to login.
 *    Callback=loginFailure
 * 3. Pending post: The user can make the post at this point.
 *    Callback=pendingPost
 * 4. postSubmit: The user submitted the form so the content is being
 *    sent to the remote server. Once it is returned, the URL will
 *    be messaged to the extension (if present) by calling the
 *    "postCompleted" callback.
 * 5. Error creating post: The remote server would not accept the user's
 *    content. The app should display an error message.
 *    Callback=createError
 * 6. Completed post: The remote server has returned a URL. This app should
 *    display it and fire the URL event.
 *    Callback=postCompleted
 */
var callbacks = {
  
  /**
   * Initialize the whole application.
   */
  pendingLogin: function() {
    
    // Set the nav bar to the proper domain
    privlyNetworkService.initializeNavigation();
    
    // Initialize message pathway to the extension.
    messaging.initialize();
    
    // Add listeners to show loading animation while making ajax requests
    $(document).ajaxStart(function() {
      $('#loadingDiv').show(); 
    });
    $(document).ajaxStop(function() { 
      $('#loadingDiv').hide(); 
    });
    
    privlyNetworkService.initPrivlyService(true, callbacks.pendingPost, 
                                            callbacks.loginFailure, 
                                            callbacks.loginFailure);
  },
  
  /**
   * Prompt the user to sign into their server. This assumes the remote
   * server's sign in endpoint is at "/users/sign_in".
   */
  loginFailure: function() {
    var message = "We were unable to sign you into your content server please " + 
                  "<a href='" + privlyNetworkService.contentServerDomain() + "/users/sign_in' target='_blank'>sign in</a> to " +
                  "<a href=''>continue</a>";
    $("#messages").html(message);
  },
  
  /**
   * Tell the user they can create their post by updating the UI.
   */
  pendingPost: function() {
    
    privlyNetworkService.showLoggedInNav();
    
    $('#posts').dataTable();
    
    privlyNetworkService.sameOriginGetRequest(
      privlyNetworkService.contentServerDomain() + "/posts", 
      callbacks.postCompleted);
    
    $("#messages").text("");
  },
  
  /**
   * Submit the posting form and await the return of the post.
   */
  postSubmit: function() {
    //pass
  },
  
  /**
   * Tell the user that there was a problem.
   */
  createError: function() {
    $("#messages").text("There was an error fetching your posts.");
  },
  
  /**
   * Display the table of posts stored at the server.
   */
  postCompleted: function(response) {
    for(var i = 0; i < response.json.length; i++) {
      
      var privlyDataURL = privlyParameters.parameterStringToHash(response.json[i].privly_URL).privlyDataURL;
      var manageURL = privlyDataURL.replace("format=json", "format=html");
      manageURL = manageURL.replace(".json", ".html");
      
      $('#posts').dataTable().fnAddData( ["<a href='#' class='view_link' data-privly-app-link='" + response.json[i].privly_URL + "'>View</a>",
                                          "<a target='_blank' href=" + manageURL + ">Manage</a>",
                                          response.json[i].created_at,
                                          response.json[i].burn_after_date,
                                          response.json[i].updated_at,
                                          response.json[i].privly_application,
                                          response.json[i].public] );
    }
    
    $('body').on('click', 'a.view_link', function() {
      
      $('#table_col').removeClass('col-lg-12');
      $('#iframe_col').addClass('col-lg-4');
      $('#table_col').addClass('col-lg-8');
      $('#iframe_col').css('display', 'inherit');
      
      var href = $(this).attr("data-privly-app-link");
      var params = href.substr(href.indexOf("?") + 1);
      var app = privlyParameters.parameterStringToHash(params).privlyApp;
      if(/^[a-zA-Z]+$/.test(app)) {
        $(".privly_iframe").html("<iframe src='../" + 
                                    app + "/show.html?" + params + "'></iframe>");
      }
    });
  }
}

/**
 * Message handlers for integration with extension framworks.
 */
var messaging = {
  
  /**
   * Attach the message listeners to the interface between the extension
   * and the injectable application.
   */
  initialize: function() {
      privlyExtension.initialContent = messaging.initialContent;
      privlyExtension.messageSecret = messaging.messageSecret;
      
      // Initialize message pathway to the extension.
      privlyExtension.firePrivlyMessageSecretEvent();
  },
  
  
  /**
   * Listener for the initial content that should be dropped into the form.
   * This may be sent by a browser extension.
   *
   * @param {json} data A json document containing the initial content for
   * the form.
   */
  initialContent: function(data) {},

  /**
   * Request the initial content from the extension. This callback is executed
   * after the extension successfully messages the secret message back to the
   * application.
   * 
   * @param {json} data A json document that is ignored by this function.
   */
  messageSecret: function(data) {}
  
}

// Initialize the application
document.addEventListener('DOMContentLoaded', callbacks.pendingLogin);