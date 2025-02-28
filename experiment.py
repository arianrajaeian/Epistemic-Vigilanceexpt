"""An experiment testing epistemic vigilance as a hypothesis to explain egocentric discounting"""

import logging
from dallinger.config import get_config
from dallinger.networks import Chain
from dallinger.experiment import Experiment
from operator import attrgetter
import random
import json
import gevent
from datetime import datetime

logger = logging.getLogger(__file__)

conditions = ["Cooperative", "Competitive", "Neutral"]
metacognition = ["Yes", "No"]

N = 1 # How many networks and participants do you want? This also controls how many more participants are recruited by recruit()

class Epivigi(Experiment):
    """Define the structure of the experiment."""

    def __init__(self, session=None):
        """Call the same function in the super (see experiments.py in dallinger).

        A few properties are then overwritten.

        Finally, setup() is called.
        """
        super(Epivigi, self).__init__(session)
        from . import models  # Import at runtime to avoid SQLAlchemy warnings

        self.models = models
        self.experiment_repeats = N # How many networks?
        self.initial_recruitment_size = 1
        self.inactivity_time_limit =  2700 # How long (seconds) of no response before a node is failed and the participant replaced
        self.known_classes = {
            "Drone" : models.Drone,
            "Probe" : models.Probe,
            "Answer_Info" : models.Answer_Info,
            "JSON_Info" : models.JSON_Info,
            "First_guess" : models.First_guess,
            "Second_guess" : models.Second_guess,
            "Social_info" : models.Social_info,
            "Comp_Info" : models.Comp_Info,
            "Finished" : models.Finished,
        }

        if session:
            self.setup()

    def create_network(self):
        """Return a new network."""
        network = self.models.RChain(max_size = 2) # create a chain network.
        network.condition = random.choice(conditions) # choose condition by random.
        network.metacognition = random.choice(metacognition) # randomly choose if there is metacognition or not.
        network.finished = "No"
        network.ready_for_B = "No"
        return network

    def get_network_for_participant(self, participant):
        if participant.nodes(failed="all"):
            return None
        for n in self.networks(): # Necessary to update network status here in case a participant has failed the data check (full doesn't update)
            n.calculate_full()
        networks = self.networks(full=False) # "networks" defined as as networks that are not full (have space)
        if networks:
            lowest_nodes = min([n.size() for n in networks]) # Find network with lowest number of nodes

            if lowest_nodes == 0: # Some networks are still empty
                available_networks = [n for n in networks if n.size() == 0] # Create a list of networks with no nodes.
            else: # lowest_nodes will be 1
                available_networks = [n for n in networks if n.size() == 1 and n.ready_for_B == "Yes"] # Create a list of networks with 1 node that have signalled they are ready for Player 2 (their player 1 is finished). 

            return random.choice(available_networks) # Pick an available network at random

        else:
            return None 

    def create_node(self, participant, network):
        """Create a Node for the participant. Varies based on whether the network already has a player 1"""
        if network.nodes(): # if there is already a node in the network, create a probe.
            node = self.models.Probe(network=network, participant=participant) # Probe = Player 2
        else: # if there are no nodes in the network, create a drone.
            node = self.models.Drone(network=network, participant=participant) # Drone = Player 1
        node.condition = node.network.condition # defines condition of node (if cooperative or competitive)
        node.metacognition = node.network.metacognition # if node has metacognition or not.
        node.bonus = "TBC" # Set this to mark that they haven't had their bonus calculated yet. Workaround for the occassional double bonus bug. 
        return node

    def info_post_request(self,node,info):
        """Varies based on info type"""

        node.update_last_request_time()
        if info.type == "Finished":
            # Signal that the node has finished data collection. So don't fail it.
            node.finished = "Yes"
            node.network.ready_for_B = "Yes" # Workaround to ensure that participants don't get assigned to networks without a completed player 1
            if node.type == "Probe_node":
                # Signal that the network is finished. For the benefit of experiment_ongoing
                node.network.finished = "Yes"    
        # this function says that after an info is created, if the info type is "Finished" (which is
        # the last info a participant submits), make the network ready for Node B. If it was Node B that
        # finished, the network is also finished. 

    def add_node_to_network(self, node, network):
        """Add node to the chain and receive transmissions."""
        network.add_node(node)
        if node.type == "Probe_node":
            Drone = network.drones[0]
            Drone.transmit(what = self.models.JSON_Info)
            node.receive()
        # if the node that was added to the network was participant 2, have participant 1 transmit the
        # info it created and have participant 2 receive that info.

    def bonus(self, participant):
        """This function runs when a participant completes the experiment. Here, we manually award the bonuses to player 1 if the player is 2 and let the function resolve
        as normal for player 2."""
        my_node = participant.nodes()[0]

        #self.log(my_node)   
        if my_node.type == "Probe_node" and my_node.bonus == "TBC":
            their_node = my_node.neighbors(direction = "from")[0]
            their_participant = their_node.participant
            my_score = sum(1 for info in my_node.infos(type=self.models.Answer_Info) if info.contents == "Correct")
            my_wrongs = 20 - my_score # Assuming there are 20 questions total
            their_score = sum(1 for info in their_node.infos(type=self.models.Answer_Info) if info.contents == "Correct")
            their_wrongs = 20 - their_score
            total_bonus = (my_score + their_score) * 0.10

            if my_node.network.condition == "Cooperative":
                # Total pot split between both players
                my_bonus = total_bonus / 2
                their_bonus = total_bonus / 2

            elif my_node.network.condition == "Competitive":
               my_bonus = (my_score + their_wrongs) * 0.10
               their_bonus = (their_score + my_wrongs) * 0.10

            elif my_node.network.condition == "Neutral":
                # Playing for your own pot only
                my_bonus = my_score * 0.10
                their_bonus = their_score * 0.10

            my_bonus = round(my_bonus,2)
            their_bonus = round(their_bonus,2)

            # Record the bonus amounts as a property on the nodes
            my_node.bonus = my_bonus
            their_node.bonus = their_bonus

            # bonus to them
            self.log("Bonus = {}: paying bonus".format(their_bonus))
            their_participant.recruiter.reward_bonus(
                their_participant,
                their_bonus,
                self.bonus_reason(),
                )
            return my_bonus
        else:
            return 0

    def recruit(self):
        """Recruit runs automatically when a participant finishes.
        Check if we have N nodes and no working participants. If so, recruit another block of participants (they will be Player 2s)"""
        """Note, will not run unless auto_recruit is set to true."""

        self.log("Calling recruit now...") # Interestingly, this actually called in debug mode and recruited N participants despite auto_recruit being false. 
        if self.networks(full=True):
            self.recruiter.close_recruitment()
        summary = self.log_summary()
        working_number = 0
        for item in summary:
            if 'working' in item:
                working_number = working_number + 1
                self.log(working_number)       

        if all([len(n.nodes()) == 1 for n in self.networks()]) and working_number == 0: # Is there exactly 1 node per network (1 player 1) and no participants working?
            self.recruiter.recruit(n=N) # Recruit another block of N participants

    def data_check(self, participant):
        """Check that the data are acceptable.

        Return a boolean value indicating whether the `participant`'s data is
        acceptable. This is meant to check for missing or invalid data. This
        check will be run once the `participant` completes the experiment. By
        default performs no checks and returns True. See also,
        :func:`~dallinger.experiments.Experiment.attention_check`.

        """
        self.log(len(participant.infos(type = self.models.Answer_Info)))
        if len(participant.infos(type = self.models.Answer_Info)) != 4: # We expect the participant to have 20 answer infos (record of correct/incorrect) if all has worked
            try: # This try block is necessary to catch cases where players are sent to the woops page (by then, they have not even created a Node).
                node = participant.nodes()[0] 
                node.network.finished = "No" # Signal that the network has still not finished
                if node.type == "Drone_node":
                    node.network.ready_for_B = "No" # If a Player 1 fails the datacheck, also signal that the network is not ready for Player 2 yet.
            except:
                pass
            finally:
                return False # If a participant fails the data check, their node is failed and auto_recruit will replace them automatically
        else:
            return True

    @property
    def background_tasks(self):
        return [
           self.stiller_remover,
        ] 

    def experiment_ongoing(self):
        """Is the experiment still going. Once participants reach the questionnaire, this will stop"""
        return any([n.finished != "Yes" for n in self.networks()])

    def stiller_remover(self):
        """Remove any stillers"""
        while self.experiment_ongoing():
            gevent.sleep(2)
            for net in self.unfinished_networks():
                self.node_kicker()

    def node_kicker(self):
        for net in self.unfinished_networks():
            for n in net.nodes():
                current_time = datetime.now()
                if (current_time - n.last_request).total_seconds() > self.inactivity_time_limit and n.finished != "Yes":
                    self.log("Node booted")
                    n.fail()
                    net.calculate_full()
                    self.save()

    def unfinished_networks(self):
        return [n for n in self.networks() if n.finished != "Yes"]
