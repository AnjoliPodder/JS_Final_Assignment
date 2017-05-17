// Final Project for General Assembly Javascript
// RecipEDIT - An Editable Recipe Box
// Author: Anjoli Podder
// Implemented functionality:
//
//


$(document).ready(function(){
  // Array to store the list of recipes currently on the page
  var recipeList = [];

  //Creds for Yummly API
  var APP_ID = "c5ee5221";
  var API_KEY = "0e885545023c48872cb32058d7288767";

  var ENTER_KEY = 13;
  var MAX_RESULTS = 12;


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
      //initiate an API call to the default source
      var request = App.requestRecipeFeed();
      //some lines of code to test
      request.done(function(response) {
        console.log(Utils.padStringRight("something", 15, "x"));
        App.extractRecipeListFromFeed(response.matches);
        App.renderRecipeList(recipeList);
      });
      // Methods that need to be called on initialization
      //App.storeRecipes;
      App.bindEvents();

    },
    requestRecipeFeed: function(query){
      var url = Utils.constructFeedURL(APP_ID, API_KEY, query);
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
        source: recipeObject.sourceDisplayName,
        name: recipeObject.recipeName.length > 44 ? recipeObject.recipeName.substring(0,44) + "..." : Utils.padStringRight(recipeObject.recipeName, 39, "-"),
        image: recipeObject.smallImageUrls[0].substring(0, recipeObject.smallImageUrls[0].indexOf("=")) + "=s360"
      };
      return Recipe;
    },
    extractRecipeListFromFeed: function(recipeObjectList){
      recipeList = [];
      recipeObjectList.forEach(function(recipeObject) {
        recipe = App.extractRecipeFromRecipeObject(recipeObject);
        recipeList.push(recipe);
      });
    },
    bindEvents: function() {
      // Attach event listeners
      $(".stylish-input-group").on("keypress", App.doSearch);
    },

    //render single recipe detail
    renderRecipe: function(recipe){
    },

    doSearch: function(e) {
      if(e.which === ENTER_KEY) {
        inputVal = $("input").val().trim().replace(" ", "+");
        if (inputVal.length > 0){
          var request = App.requestRecipeFeed(inputVal);
          request.done(function(response) {
            App.extractRecipeListFromFeed(response.matches);
            $("#portfolio").find(".row").empty();
            App.renderRecipeList(recipeList);
          });
        }
        else {
          $("input").val("");
        }
      }
    },
    //render a list of recipes
    renderRecipeList: function(listOfRecipes) {
      recipeTemplate = _.template(
        "<div class='col-sm-4 portfolio-item' id ='<%= id %>'>" +
          "<a href='#portfolioModal' class='portfolio-link' data-toggle='modal'>" +
              "<img src='<%= image %>' class='img-responsive'>" +
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
