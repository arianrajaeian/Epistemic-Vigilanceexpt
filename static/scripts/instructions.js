///// Instructions 1 /////

function beginInstructions(){
    dallinger.createParticipant()
    .done(function(resp){
        createAgent();
    })
}

function createAgent() {
    dallinger.createAgent()
    .done(function (resp) {
        my_node = resp.node;
        my_node_id = resp.node.id;
        dallinger.storage.set("my_node_id", my_node_id);
        node_type = my_node.type;
        dallinger.storage.set("node_type", node_type);
        condition = my_node.property2;
        metacognition = my_node.property4;
        dallinger.storage.set("metacognition", metacognition);
        dallinger.storage.set("condition", condition);
        dallinger.storage.set("attempts", 0); // This cookie records how many tries they take to pass the comprehension check. Necessary if they get sent back to the instruction page. 
    })
    .fail(function (rejection) {extraParticipant(); });
}

function extraParticipant(){
    // If a participant returns the submission after starting and they already created a Node, then the Node creation step will fail. 
    // To avoid continuously recruiting replacements, we need the participant to submit rather than return, so we send them to a page explaining this. 
    dallinger.goToPage('instructions/woops');
}

function backButton(){
    const button = document.getElementById('Next');
    if ($('#Two').is(':visible')) {
        $("#One").show();
        $("#Two").hide();
        $("#Back").hide();
    }
    if ($('#Three').is(':visible')){
        $("#Three").hide();
        $("#Two").show();
        button.textContent = "Next";
    }
}

function nextButton(){
    const button = document.getElementById('Next');
    if ($('#One').is(':visible')){
        $("#One").hide();
        $("#Two").show();
        $("#Back").show();
    } else if ($('#Two').is(':visible')){
        $("#Two").hide();
        $("#Three").show();
        button.textContent = "Advance study (I'm done reading)"
    } else if ($('#Three').is(':visible')){
        dallinger.goToPage('instructions/mocktrials')
    }
}

//// Mock trials ////
function continueTrial(){
    if ($('#answer_div').is(':visible')){
        if (Questions == 5){
            dallinger.goToPage('instructions/Instructions_2');
        } 
        else if(Questions < 5){
            displayPageElements();
            $("#Small_header").html("You are about to see a practice question. When you are ready, click the button below to reveal the image.");
        }
    } else {       
        generateDots();
        presentDisplay();
        Questions = Questions + 1
        $("#Small_header").hide();
        $("#Next").hide();
    }        
}

function displayPageElements(){
    $("#answer_div").hide(); 
    $("#Small_header").show();
    $("#Next").show();
};

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function randi(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDots () {

        // Display parameters
        width = 600;
        height = 400;
        blueDots = Math.floor(Math.random() * 41); // Generate a random number of blue dots between 0 and 40.
        yellowDots = 40 - blueDots
        if(blueDots < 40){
           blueDots = blueDots + Math.round(Math.random()) // To allow there to be odd differences 
        }
        blueDots = blueDots + 5
        yellowDots = yellowDots + 5

        excess = blueDots - yellowDots
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
        allowGuess();
    }, 2000);
}    

function allowGuess(){
    $("#stimulus_div").hide();
    $("#Small_header").show();
    $("#Small_header").html("How many more blue circles were there than yellow circles?");
    $("#Slider").show();
    $("#Submit").show();
}

function submitAnswer(answer){
    $("#Small_header").hide();
    $('#Submit').prop('disabled', true);    
    $("#Submit").hide();
    $("#Slider").hide();
    $('#Guessslider').data('ionRangeSlider').reset();
    $("#Next").show();
    $("#Answer").html("The correct answer was: " + excess)
    if(Math.abs(answer - excess) <= 3){
       $("#Feedback").html("Your answer would be marked as correct.") 
    } else {
       $("#Feedback").html("Your answer would be marked as incorrect.")
    }
    $("#answer_div").show();    
}


//// Instructions 2 ////
function startPage(){
    retrieveAgent();
}

function retrieveAgent(){
    my_node_id = dallinger.storage.get("my_node_id");
    node_type = dallinger.storage.get("node_type");
    condition = dallinger.storage.get("condition");
    metacognition = dallinger.storage.get("metacognition");
    displayPage();
}

function displayPage(){
    if(node_type == "Drone_node"){
        $("#My_role").html("You will be player 1 in this study. This means you will answer each question once. After answering each question, you will leave advice for player 2 about what they should answer.");
    } else {
        $("#My_role").html("You will be player 2 in this study. This means you will answer each question twice. First without receiving any information from player 1, and then again after receiving information from player 1.");
    }

    if(condition == "Cooperative"){
        $("#Bonus_Instruct").html("both players earn a $0.05 bonus. As such, both players benefit from each other's performance.");
    } else if (condition == "Competitive"){
        $("#Bonus_Instruct").html("$0.10 is added to their bonus fund. Whenever either player gets a question wrong, $0.10 is added to the other player's bonus fund. As such, players benefit from their partner performing poorly.");
    } else if (condition == "Neutral"){
        $("#Bonus_Instruct").html("they earn a $0.10 bonus. As such, each player benefits from their own performance, regardless of their partner's performance.");
    }
    if (metacognition == "Yes") {
        $("#meta_instruct").html("Player 1 will give advice on what they think the answer is, as well as how confident they are in their answer.");
    } else {
        $("#meta_instruct").html("Player 1 will give advice on what they think the answer is.");
    }
}

function backButton2(){
    $("#Second_instructions").hide();
    $("#First_instructions").show();
    $("#Advance").hide();
    $("#Back").hide();
    $("#Next").show();
}

function nextButton2(){
    $("#First_instructions").hide();
    $("#Second_instructions").show();
    $("#Advance").show();
    $("#Next").hide();
    $("#Back").show();
}

//// Comprehension ////
function determineCondition(){
    Condition = dallinger.storage.get("condition");
    if(Condition == "Cooperative"){
        comprehensionTwo = "Both players earn a $0.05 bonus";
        comprehensionThree = "Neither player earns a bonus";
    } else if(Condition == "Competitive"){
        comprehensionTwo = "They earn a $0.10 bonus";
        comprehensionThree = "The other player earns a $0.10 bonus";
    } else if(Condition == "Neutral"){
       comprehensionTwo = "They earn a $0.10 bonus";
       comprehensionThree = "Neither player earns a bonus"; 
    }
    my_node_id = dallinger.storage.get("my_node_id");
}

function pingButton(type, response){
    if(type == "Task"){
      $("#Task").html(response);  
    } else if(type == "Answer"){
      $("#Answer").html(response);   
    } else if(type == "Advice"){
      $("#Advice").html(response); 
    } else if(type == "Bonus"){
      $("#Bonus").html(response);  
    } else if (type == "Wrong"){
      $("#Wrong").html(response);
    }
}

function attemptAdvance(){
    questionAttempts = questionAttempts + 1
    pageAttempts = pageAttempts + 1
    if($("#Task").text() == "True" && $("#Answer").text() == "True" && $("#Advice").text() == "True" && $("#Bonus").text() == comprehensionTwo && $("#Wrong").text() == comprehensionThree){
        dallinger.createInfo(my_node_id ,{
            contents: questionAttempts,
            info_type: 'Comp_Info'
        }).done(function(resp){
            dallinger.goToPage('experiment');
        })  
    } else {
        $("#warning").show();
        if(pageAttempts == 2){
            $("#warning").html("You seem to be having some trouble with these questions. Have one more try, but if you don't get them right this time, we will send you back to re-read the instructions. If you'd rather just return the experiment, you can do so by closing the window and clicking ‘return’.")
        }
        if(pageAttempts == 3){
            dallinger.storage.set("attempts", 3)
            dallinger.goToPage('instructions/Instructions_2');  
        }
    }
}