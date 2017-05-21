// Final Project for General Assembly Javascript
// RecipEDIT - An Editable Recipe Box
// Author: Anjoli Podder
// Implemented functionality:
//
//


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
  var APP_ID = "c5ee5221";
  var API_KEY = "0e885545023c48872cb32058d7288767";

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
  var currentUser;

  // Utils object to store any misc. methods
  var Utils = {
    constructFeedURL: function(app_id, app_key, query, start){
      var URL = "http://api.yummly.com/v1/api/recipes?";
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

    constructRecipeURL: function(app_id, app_key, recipe_id){
      //http://api.yummly.com/v1/api/recipe/recipe-id?_app_id=YOUR_ID&_app_key=YOUR_APP_KEY
      var URL = "http://api.yummly.com/v1/api/recipe/";
      return URL +
             recipe_id +
             "?_app_id=" + app_id +
             "&_app_key=" + app_key;
    },
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
      console.log("init!");
      App.bindEvents();
      //initiate an API call to the default source
      var request = App.requestRecipeFeed();
      //some lines of code to test
      request.done(function(response) {
        $("#portfolio").find(".row").empty();
        recipeList = [];
        App.extractRecipeListFromFeed(response.matches, false);
        App.renderRecipeList(recipeList);
        $("#loadMore").show();
      });
    },
    requestRecipeFeed: function(query, start){
      var url = Utils.constructFeedURL(APP_ID, API_KEY, query, start);
      console.log(url);
      return $.ajax(url, {
        dataType: 'json'
      });
    },

    requestSingleRecipe: function(recipeId){
      var url = Utils.constructRecipeURL(APP_ID, API_KEY, recipeId);
      return $.ajax(url, {
        dataType: 'json'
      });
    },

    extractRecipeFromRecipeObject: function(recipeObject){
      var Recipe = {
        id: recipeObject.id,
        name: recipeObject.recipeName.length > 33 ? recipeObject.recipeName.substring(0,33) + "..." : Utils.padStringRight(recipeObject.recipeName, 35, "_"),
        image: recipeObject.smallImageUrls[0].substring(0, recipeObject.smallImageUrls[0].indexOf("=")) + "=s360"
      };
      return Recipe;
    },
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

    bindEvents: function() {
      // Attach event listeners

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
      $(".navbar-brand").on("click", this.init.bind(this));
      $("#myRecipes").on("click", this.showMyRecipes.bind(this));

    },
    deleteRecipe: function(){
  /*    foundRecipeInList = _.findWhere(myRecipes, {id: recipeDetail.id});
      if (foundRecipeInList === undefined){
        alert("This recipe is not in your collection");
      } else {
        myRecipes= _.without(myRecipes, _.findWhere(myRecipes, {id: recipeDetail.id}));
        alert("Recipe deleted");
      } */
    },
    showMyRecipes: function(){
      console.log("showMyRecipes triggered");
      firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
          // Signed-in User Information
          currentUser = user;
          console.log(currentUser);
          console.log(currentUser.displayName);
          myRecipes = db.ref("users/" + user.uid + "/myRecipes");
          $("#portfolio").find(".row").empty();
          $("#loadMore").hide();
          recipeListFromDB = [];
          db.ref("users/" + currentUser.uid + "/myRecipes").once('value').then(function(snapshot){
            snapshot.forEach(function(recipeSnapshot){
              recipeListFromDB.push(recipeSnapshot.val());
            });
            console.log("rendering MyRecipes");
            App.renderRecipeList(recipeListFromDB);
          });
        } else {
          // Google Sign-in
          firebaseAuth.signInWithPopup(provider).then(function(result) {
          }).catch(function(error) {
            console.log(error);
          });
        }
      });

    },
    saveRecipe: function(){
      foundRecipeInList = _.findWhere(myRecipes, {id: recipeDetail.id});
      if (foundRecipeInList === undefined){
        var Recipe = {
          id: recipeDetail.id,
          name: recipeDetail.name > 33 ? recipeDetail.name.substring(0,33) + "..." : Utils.padStringRight(recipeDetail.name, 35, "_"),
          image: recipeDetail.image
        };
        myRecipes.push(Recipe);
        alert("Recipe Saved");
      } else {
        alert("Recipe already in list");
      }
    },
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

    loadMoreRecipes: function(){
      var request = App.requestRecipeFeed(currentQuery, numVisibleRecipes);
      //some lines of code to test
      request.done(function(response) {
        console.log("Loading more recipes");
        App.extractRecipeListFromFeed(response.matches, true);
        App.renderRecipeList(recipeList);
      });
    },
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
          App.init();
        }
      }
    },
    //render a list of recipes
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
