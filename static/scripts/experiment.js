var Player
var Questions = 0 // Leave this as 0, this is a counter for the number of questions the participant has done. 
var numQuestions = 4 // How many questions in total? changed it from 20 to 5
var transmitted_blueDots = 0
var transmitted_yellowDots = 0
var time = 0 // How long have participants spent

function tickClock(){
  time = time + 1; // update the value of "time" to increase by 1.
  setTimeout(function(){
    tickClock();
  }, 1000) // function runs every second
} // basically this function increases the value of the variable "time" by 1 every second.

function resetTimer() { 
  time = 0
} // resets time to 0.

function determinePlayer(){
    node_id = dallinger.storage.get("my_node_id");
    node_type = dallinger.storage.get("node_type");
    metacognition = dallinger.storage.get("metacognition"); // retrieve info about if there is metacognition.
    if(node_type == "Drone_node"){
        Player = "A" // if the node is a drone, it's player A.
    } else {
        Player = "B" // if it is a probe, it's player B
    }    
} // this function doesn't call other functions.

function getInfo() {
  // Get info for node
  dallinger.getReceivedInfos(node_id) // calls this function in dallinger
    .done(function (resp) {
        Infos = resp.infos // defines variable "Infos" as the infos in what function gives you back.
    })
    .fail(function (rejection) {
      console.log(rejection);
      $('body').html(rejection.html);
    });
};

function extractInfo(){
    // Pull out the needed information for player B
    Contents = JSON.parse(Infos[Questions - 1].contents);
    transmitted_blueDots = Contents.Blue; // Transmit the blue dots
    transmitted_yellowDots = Contents.Yellow; //Transmit yellow dots 
    A_advice = Contents.Advice; // Player A's advice 
    if (metacognition == "Yes"){
        A_confidence = Contents.Confidence; // Player A's confidence
    }
    //if(Contents.Question != Questions){
       // dallinger.goToPage('survey');
    //};
    return Promise.resolve(); // huh
}

async function continueTrial() { // this function moves them along from question to question.
    console.log("Called continue trial");
  if ($('#feedback_div').is(':visible') || $('#Info_div').is(':visible')) {
    $("#feedback_div").hide();
    $("#Info_div").hide();
    $("#Next").show(); 
    $("#Small_header").html("When you are ready to continue, click the button below.");
  } else {
    Questions = Questions + 1;
    if (Questions > numQuestions) {
      dallinger.createInfo(node_id, {
        contents: "End",
        info_type: 'Finished'
      }).done(function(resp) {
        dallinger.goToPage('survey'); // if participant has answered all 20 questions, finish and go to survey.
      });                  
    } else { 
      if (Player == "B") { // player 2 has to wait for dallinger to transmit player A's data for that question first.
        await extractInfo();
      }
      resetTimer();
      $("#Main_header").html("Question " + Questions + " / " + numQuestions);          
      $("#Small_header").hide();
      $("#Next").hide();        
      generateDots(transmitted_blueDots, transmitted_yellowDots); //present new set if blue/yellow dots
      presentDisplay(); // calls this function
    }         // basically moves participant onto next question if they haven't finished yet.
  }   
}

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function randi(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDots(transmitted_blueDots, transmitted_yellowDots) {
        // Display parameters
        width = 600;
        height = 400;
        if(Player == "A"){
            // generate the array for player 1
            blueDots = Math.floor(Math.random() * 41); // Generate a random number of blue dots between 0 and 40.
            yellowDots = 40 - blueDots // yellow and blue dots always add up to 10.
            if(blueDots < 40){
                blueDots = blueDots + Math.round(Math.random()) // To allow there to be odd differences. 
            }
            yellowDots = yellowDots + 5 // Note, you must add at least 1. Otherwise, if there are 10 blue dots, there will be 0 yellow dots. 
            blueDots = blueDots + 5            
        } else {
            // Its a player 2 question, so it must be the same but more difficult
            blueDots = transmitted_blueDots
            yellowDots = transmitted_yellowDots
        }

        excess = blueDots - yellowDots // excess is how many more blue than yellow dots
        numDots = blueDots + yellowDots
        dots = [];
        sizes = [];
        rMin = 20; // The dots' minimum radius.
        rMax = 20;
        horizontalOffset = (window.innerWidth - width) / 2;

        paper = Raphael(horizontalOffset, 200, width, height);

        colors = [];
        colorsRGB = ["#428bca", "#FBB829"];

        for (var i = blueDots - 1; i >= 0; i--) {
            colors.push(0);
        }

        for (var i = yellowDots - 1; i >= 0; i--) {
            colors.push(1);
        }

        colors = shuffle(colors);

        while (dots.length < numDots) {

            // Pick a random location for a new dot.
            r = randi(rMin, rMax);
            x = randi(r, width - r);
            y = randi(r, height - r);

            // Check if there is overlap with any other dots
            pass = true;
            for (var i = dots.length - 1; i >= 0; i--) {
                distance = Math.sqrt(Math.pow(dots[i].attrs.cx - x, 2) + Math.pow(dots[i].attrs.cy - y, 2));
                if (distance < (sizes[i] + r)) {
                    pass = false;
                }
            }

            if (pass) {
                var dot = paper.circle(x, y, r);
                dot.hide();
                // use the appropriate color.
                dot.attr("fill", colorsRGB[colors[dots.length]]); // FBB829
                dot.attr("stroke", "#fff");
                dots.push(dot);
                sizes.push(r);
            }
        }
    }

function presentDisplay (argument) {
    for (var i = dots.length - 1; i >= 0; i--) {
        dots[i].show();
    }
    $("#stimulus_div").show();
    setTimeout(function() {
        for (var i = dots.length - 1; i >= 0; i--) {
            dots[i].hide();
        }

        lock = false;
        paper.clear();
        allowGuess(); // calls allowGuess function
    }, 2000); // I think this is the function that displays the dots for 2 seconds.
}

function allowGuess(){ // prompts participant to guess number of dots
    $("#stimulus_div").hide();
    $("#Small_header").show();
    $("#Small_header").html("How many more blue circles were there than yellow circles?");
    $("#Slider").show(); //shows slider
    $("#guessLabel").html("Indicate your answer using the slider.")
    $("#secondSlider").hide(); // hide the confidence slider.
    $("#Submit_answer").show(); // allows you to submit answer. it calls the submitAnswer() function on click.
}

function submitAnswer(answer){
    $('#Guessslider').data('ionRangeSlider').reset(); //resets slider
    disableButtons(); //calls disable buttons function
    $("#Submit_answer").hide();
    if(Player == "A"){
        adviceDiv(answer); // if it's player A, call advice div with the parameter value as "answer", which will be their answer.
    } else {
        socialDiv(answer); // if it's player B, call socialDiv function
    }
}

function adviceDiv(answer){
    // Show the information for player 1
    $("#advice_score").html("0");
    $("#Submit_advice").show(); // button that allows you to submit
    $("#feedback_div").show(); // overall div
    $("#Small_header").html("You answered: " + answer);
    $("#guessLabel").html("What would you like to tell Player 2 your answer was?")
    if (metacognition == "Yes"){
        $("#confidence_score").html("5");
        $("#Confidence").show();
        $("#secondSlider").show(); // show the confidence slider
    } else {
        $("#Confidence").hide();
    }
    createOutcomeInfo(answer); // calls this function
    Answer = answer; //not sure why, but it saves what you answered for your answer as "Answer"
}
 
function socialDiv(answer){
    // Show the information for player 2
    resps = {
        "Question" : Questions,
        "Answer" : answer
    }
    dallinger.createInfo(node_id,{ // creates info of player A's guess
        contents: JSON.stringify(resps),
        info_type: 'First_guess',
        property1: JSON.stringify({
            "time_spent" : time
        })
    })
    resetTimer();     
    $("#Info_div").show();
    $("#Submit_revision").show();      
    $("#Small_header").html("Your first answer was: " + answer);
    $("#first_guess").html("You may now amend your answer if you wish.");  
    displayAdvice();
} 

function displayAdvice(){
    $("#button_div").hide();    
    $("#extra_info").hide();
    $("#Social_info").html("Player 1 rated their answer as " + A_advice); //also state their confidence.
    if (metacognition == "Yes"){
        $("#conf_info").html("Player 1 rated their confidence in their answer as: " + A_confidence + " out of 10.")
    }
    resps = { // need to understand this better, but defines its content as player A's advice
        "Question" : Questions,
        "Type" : "Advice",
        "Content" : A_advice,
    }
    if (metacognition == "Yes"){
        resps["Confidence"] = A_confidence;
    }
    dallinger.createInfo(node_id,{
        contents: JSON.stringify(resps),
        info_type: 'Social_info'
    })      
}


function submitAdvice(advice, confidence = null){ // confidence slider will be basically like this.
    // Only runs for player 1
    $('#Guessslider').data('ionRangeSlider').reset(); //resets slider
    $('#ConfSlider').data('ionRangeSlider').reset();
    Advice = advice; // html gives the parameter value for this argument, which this function saves as the variable (Advice)
    if (metacognition == "Yes"){
        Confidence = confidence;
    }    
    disableButtons(); // calls function
    createJSONInfo(); // calls function
    $("#Slider").hide(); //hides slider
    $("#Submit_advice").hide();
    continueTrial(); // calls function
}


function submitRevision(revision){
    $('#Guessslider').data('ionRangeSlider').reset();
    $("#button_div").hide();
    disableButtons();
    // Only runs for player 2
    resps = {
        "Question" : Questions,
        "Answer" : revision
    };
    dallinger.createInfo(node_id,{
        contents: JSON.stringify(resps),
        info_type: 'Second_guess',
        property1: JSON.stringify({
            "time_spent" : time
        })
    }).done(function(resp){
        resetTimer();
        createOutcomeInfo(revision);
        $("#Social_info ").html("");        
        $("#Slider").hide();
        $("#Submit_revision").hide();
        continueTrial();  
    });     
}

function createOutcomeInfo(finalAnswer){
    if(Math.abs(finalAnswer - excess) <= 3){
        Outcome = "Correct";
    } else {
        Outcome = "Incorrect";
    }
    dallinger.createInfo(node_id,{
        contents: Outcome,
        info_type: 'Answer_Info'
    })   
}

function createJSONInfo(){
    // Create the large JSON info for player 2
    resps = {
        "Question" : Questions ,
        "Blue" : blueDots,
        "Yellow" : yellowDots,
        "Advice" : Advice,
    };
    if (metacognition == "Yes"){
        resps["Confidence"] = Confidence;
    }
  resps = JSON.stringify(resps);
  dallinger.createInfo(node_id, {
    contents: resps,
    info_type: 'JSON_Info',
    property1: JSON.stringify({
        "time_spent" : time
    })
  }).done(function(resp){
    resetTimer();
  }); 
}

function updatePoints(value) {
  // Code for slider to update text displayed
  value = parseInt(value);
  $("#advice_score").html(value);
} // add one for the confidence player 2 will see is: + value. 

function updateConfidence(conf_level) {
    // Code for slider to update text displayed
    conf_level = parseInt(conf_level); // turns the string into an integer.
    $("#confidence_score").html(conf_level);
  } 

function disableButtons(){ // disables buttons
    $('#Submit_answer').prop('disabled', true); 
    $('#Submit_advice').prop('disabled', true); 
    $('#Submit_revision').prop('disabled', true); 
}

function enableButtons(){
    $('#Submit_answer').prop('disabled', false);
    $('#Submit_advice').prop('disabled', false);
    $('#Submit_revision').prop('disabled', false);      
}
