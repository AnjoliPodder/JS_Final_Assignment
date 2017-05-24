/*******************************************************************************
// Final Project for General Assembly Javascript
// RecipEDIT - An Editable Recipe Box
// Author: Anjoli Podder
// Implemented functionality:
// - Retrieve and display list of recipes from Yummly API
// - Click in to single recipe to see detailed view in a modal
// - Click button in modal to open new tab with full recipe
// - Save recipes to personal collection (requires authentication with Google)
// - Delete recipes from personal collection (requires authentication)
// - Check to see whether the recipe is in your list before saving or deleting
// - Search for recipes by keyword
// - Retrieve more recipes
// - Click RecipEDIT text to refresh the page
// - Edit the recipe ingredients by double clicking
// - Deployed to Firebase at https://recipedit-37d30.firebaseapp.com/

// Wanted to complete, but ran out of time:
// - Proper login/logout functionality on the page
// - Save the edited ingredients list when saving the recipe
// - Infinite scroll (this was kind of working, but replaced with "load more" button)
*******************************************************************************/


$(document).ready(function(){
  // Array to store the list of recipes currently on the page
  var recipeList = [];
  // variable to show the number of recipes on the page. Used as the start point
  // for subsequent API calls when loading more recipes
  var numVisibleRecipes = 0;

  // Contains the current recipe visible in the modal
  var recipeDetail;
  // Contains the current active query. Used for loading more recipes while
  // there is an active search
  var currentQuery;

  //Creds for Yummly API
  var yummlyConfig = {
    APP_ID: "c5ee5221",
    API_KEY: "0e885545023c48872cb32058d7288767"
  };

  //Global variables
  var ENTER_KEY = 13;
  var MAX_RESULTS = 12;

  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyD33XOpuHx6SE8akdmIxmeQMtLoJ2L4Ll4",
    authDomain: "recipedit-37d30.firebaseapp.com",
    databaseURL: "https://recipedit-37d30.firebaseio.com",
    projectId: "recipedit-37d30",
    storageBucket: "recipedit-37d30.appspot.com",
    messagingSenderId: "541859645941"
  };
  firebase.initializeApp(config);
  var db = firebase.database();
  var firebaseAuth = firebase.auth();
  var provider = new firebase.auth.GoogleAuthProvider();
  var myRecipes;

  // Utils object to store any misc. methods
  var Utils = {
    constructFeedURL: function(app_id, app_key, query, start){
      var URL = "https://api.yummly.com/v1/api/recipes?";
      var q = query === undefined ? "" : "&q=" + query;
      var s = start === undefined ? "" : "&start=" + start;
      return URL +
             "_app_id=" + app_id +
             "&_app_key=" + app_key +
             q +
             "&requirePictures=true" +
             "&maxResult=" + MAX_RESULTS +
             s ;
    },

    // Construct the URL for the API call for a single recipe
    constructRecipeURL: function(app_id, app_key, recipe_id){
      var URL = "https://api.yummly.com/v1/api/recipe/";
      return URL +
             recipe_id +
             "?_app_id=" + app_id +
             "&_app_key=" + app_key;
    },

    // Pad a string to the given number of chars. I use this to ensure that the
    // recipe titles are of similar length to prevent UI wonkiness. It would have
    // been preferable to fix this in the css (but I wasn't able to figure it out!)
    padStringRight: function(inputString, num_chars, pad_char){
      var outputString = inputString;
      if(num_chars > inputString.length){
        for(i=0; i < num_chars-inputString.length; i++){
          outputString = outputString + pad_char;
        }
      }
      return outputString;
    }
  };

  // App object to store all app related methods
  var App = {
    init: function() {
      App.bindEvents();
      App.refreshFeed();
    },

    // event listeners
    bindEvents: function() {
      $(".modal-body").on("click", "#saveRecipe", this.saveRecipe.bind(this));
      $(".modal-body").on("click", "#deleteRecipe", this.deleteRecipe.bind(this));
      $("#ingredientList").on("dblclick", "p", function(){
        this.contentEditable=true;
        this.className='inEdit';
      });
      $("#ingredientList").on("blur", "p", function(){
        this.contentEditable=false;
        this.className='';
      });
      $(".stylish-input-group").on("keypress", this.doSearch.bind(this));
      $(".glyphicon-search").on("click", this.doSearch.bind(this));
      $("#portfolio").on("click", ".portfolio-item", App.renderRecipe);
      $("#loadMore").on("click", this.loadMoreRecipes.bind(this));
      $(".navbar-brand").on("click", this.refreshFeed.bind(this));
      $("#myRecipes").on("click", this.showMyRecipes.bind(this));

    },

    //load the starting screen with the default recipe list
    refreshFeed: function(){
      //initiate an API call to the default source
      var request = App.requestRecipeFeed();
      request.done(function(response) {
        $("#portfolio").find(".row").empty();
        recipeList = [];
        App.extractRecipeListFromFeed(response.matches, false);
        App.renderRecipeList(recipeList);
        $("#loadMore").show();
      });
    },

    // Call the Yummly API and retrieve list of recipes
    requestRecipeFeed: function(query, start){
      var url = Utils.constructFeedURL(yummlyConfig.APP_ID, yummlyConfig.API_KEY, query, start);
      console.log(url);
      return $.ajax(url, {
        dataType: 'json'
      });
    },

    // Retrieve single recipe detail via the Yummly Recipe API
    requestSingleRecipe: function(recipeId){
      var url = Utils.constructRecipeURL(yummlyConfig.APP_ID, yummlyConfig.API_KEY, recipeId);
      return $.ajax(url, {
        dataType: 'json'
      });
    },

    // Extract recipe details from a single recipe object in the API response to be displayed on page
    extractRecipeFromRecipeObject: function(recipeObject){
      var Recipe = {
        id: recipeObject.id,
        name: recipeObject.recipeName.length > 33 ? recipeObject.recipeName.substring(0,33) + "..." : Utils.padStringRight(recipeObject.recipeName, 35, "_"),
        image: recipeObject.smallImageUrls[0].substring(0, recipeObject.smallImageUrls[0].indexOf("=")) + "=s360"
      };
      return Recipe;
    },

    // When given a list of recipes from the API, extract each recipe to a format
    // that's useful to the rendering function and push to an array to be displayed
    extractRecipeListFromFeed: function(recipeObjectList, append){
      if (!append){
        numVisibleRecipes = 0;
      }
      recipeList = [];
      recipeObjectList.forEach(function(recipeObject) {
        recipe = App.extractRecipeFromRecipeObject(recipeObject);
        recipeList.push(recipe);
        numVisibleRecipes ++;
      });
    },

    googleSignIn: function(){
      firebaseAuth.signInWithPopup(provider).then(function(result) {
      }).catch(function(error) {
        console.log("ERROR:",error);
      });
    },

    // Delete a recipe from myRecipe store - the commented out code was working
    // with I was storing the recipe list locally
    deleteRecipe: function(){
      firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
          myRecipes = db.ref("users/" + user.uid + "/myRecipes");
          myRecipes.once('value', function(snapshot) {
            console.log(snapshot.val());
            console.log(recipeDetail.id);
            var exists = _.findWhere(snapshot.val(), {id:recipeDetail.id});
            console.log("exists:",exists);
            if (exists) {
              var query = myRecipes.orderByChild('id').equalTo(recipeDetail.id);
              console.log(query);
              query.on('child_added', function(snapshot) {
                snapshot.ref.remove();
              });
              $("#" + recipeDetail.id).remove();
              alert("Recipe deleted");
            } else {
              alert("Recipe is not in your collection");
            }
          });
        } else {
          App.googleSignIn();
        }
      });
    },

    // Render list of collected recipes on the page
    // Requires authentication
    showMyRecipes: function(){
      firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
          myRecipes = db.ref("users/" + user.uid + "/myRecipes");
          $("#portfolio").find(".row").empty();
          $("#loadMore").hide();
          recipeListFromDB = [];
          db.ref("users/" + user.uid + "/myRecipes").once('value').then(function(snapshot){
            snapshot.forEach(function(recipeSnapshot){
              recipeListFromDB.push(recipeSnapshot.val());
            });
            console.log(recipeListFromDB);
            // alert when the recipe list is empty - I would have preferred a
            // modal for this or to inject a message into the page
            if (recipeListFromDB.length === 0){
              alert("No Recipes To Show");
            } else {
              App.renderRecipeList(recipeListFromDB);
            }
          });
        } else {
          App.googleSignIn();
        }
      });
    },

    // Save a recipe to personal store
    // Requires authentication
    saveRecipe: function(){
      firebaseAuth.onAuthStateChanged(function(user){
        if (user) {
          myRecipes = db.ref("users/" + user.uid + "/myRecipes");
          myRecipes.once('value', function(snapshot) {
            var exists = _.findWhere(snapshot.val(), {id:recipeDetail.id});
            if (!exists) {
              var Recipe = {
                id: recipeDetail.id,
                name: recipeDetail.name.length > 33 ? recipeDetail.name.substring(0,33) + "..." : Utils.padStringRight(recipeDetail.name, 35, "_"),
                image: recipeDetail.image
              };
              myRecipes.push(Recipe);
              alert("Recipe Saved");
            } else {
              alert("Recipe already exists");
            }
          });
        } else {
          App.googleSignIn();
        }
      });
    },

    // Render single recipe detail in the modal
    renderRecipe: function(recipe){
      console.log("rendering");
      var request = App.requestSingleRecipe($(this).attr('id'));
      request.done(function(response){
        recipeDetail = {
          id: response.id,
          name: response.name,
          image: response.images[0].hostedLargeUrl.substring(0, response.images[0].hostedLargeUrl.indexOf("=")) + "=s720",
          prepTime: response.totalTime,
          servings: response.yield,
          rating: response.rating,
          ingredients: response.ingredientLines,
          link: response.source.sourceRecipeUrl,
          site: response.source.sourceDisplayName
        };
        $(".modal-body").find("h2").html(recipeDetail.name);
        $(".modal-body").find("img").attr("src", recipeDetail.image);
        $(".modal-body").find("#prepTime").html("Total Time: " + "<strong>" + recipeDetail.prepTime + "</strong>");
        $(".modal-body").find("#servings").html("Number of Servings: " + "<strong>" + recipeDetail.servings + "</strong>");
        $(".modal-body").find("#rating").html("Yummly Rating: " + "<strong>" + recipeDetail.rating + "/5</strong>");
        $(".modal-body").find("#goToSite").html("See full recipe at " + recipeDetail.site);
        $(".modal-body").find("#goToSite").attr('onclick', "window.open('" + recipeDetail.link + "','_blank')");
        $(".modal-body").find("#ingredientList").empty();
        recipeDetail.ingredients.forEach(function(ingredient){
          $(".modal-body").find("#ingredientList").append("<p contentEditable='false' class=''>" + ingredient + "</p>");
        });

      });
    },

    // Load additional recipes on the page
    loadMoreRecipes: function(){
      var request = App.requestRecipeFeed(currentQuery, numVisibleRecipes);
      //some lines of code to test
      request.done(function(response) {
        console.log("Loading more recipes");
        App.extractRecipeListFromFeed(response.matches, true);
        App.renderRecipeList(recipeList);
      });
    },

    // Perform search for recipes by keyword
    doSearch: function(e) {
      if(e.which === ENTER_KEY || e.type === "click") {
        inputVal = $("input").val().trim().replace(" ", "+");
        currentQuery = inputVal;
        if (inputVal.length > 0){
          var request = App.requestRecipeFeed(inputVal);
          request.done(function(response) {
            App.extractRecipeListFromFeed(response.matches, false);
            $("#portfolio").find(".row").empty();
            App.renderRecipeList(recipeList);
            $("#loadMore").show();
            $("input").val("");
          });
        }
        else {
          App.refreshFeed();
        }
      }
    },

    //render a list of recipes to the page
    renderRecipeList: function(listOfRecipes) {
      recipeTemplate = _.template(
        "<div class='col-sm-4 portfolio-item' id ='<%= id %>'>" +
          "<a href='#portfolioModal' class='portfolio-link' data-toggle='modal'>" +
              "<img height='240' src='<%= image %>' class='img-responsive'>" +
          "</a>" +
          "<h3 style='background-color: black;  padding: 10px; color: white; margin: 0;'> <%= name %> </h3>" +
        "</div>");
      listOfRecipes.forEach(function(recipe){
        recipeMarkup = recipeTemplate({ id: recipe.id,
                                        image: recipe.image,
                                         name: recipe.name });
        $("#portfolio").find(".row").append(recipeMarkup);
      });

    },
  };
  App.init();
});
