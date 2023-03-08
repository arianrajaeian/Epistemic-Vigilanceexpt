"""An experiment testing episemtic vigilance has a hypothesis to explain egocentric discounting"""

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

conditions = ["Cooperative", "Fully_comp", "Hybrid"]

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
        self.experiment_repeats = 1 # How many networks?
        self.initial_recruitment_size = 1
        self.inactivity_time_limit = 360 # How long before a node is failed and the participant replaced
        self.known_classes = {
            "Drone" : models.Drone,
            "Probe" : models.Probe,
            "Answer_Info" : models.Answer_Info,
            "JSON_Info" : models.JSON_Info,
            "First_guess" : models.First_guess,
            "Second_guess" : models.Second_guess,
            "Social_info" : models.Social_info,
            "Finished" : models.Finished,
        }

        if session:
            self.setup()

    def setup(self):
        """Setup the networks."""
        """Runs only if there are no networks."""
        if not self.networks():
            super(Epivigi, self).setup()

    def create_network(self):
        """Return a new network."""
        network = self.models.RChain(max_size = 2)
        network.condition = random.choice(conditions)
        network.finished = "No"
        return network

    def get_network_for_participant(self, participant):
        if participant.nodes(failed="all"):
            return None
        networks = self.networks(full=False)
        if networks:
            lowest_nodes = min([len(n.nodes()) for n in networks]) # Find the lowest number of nodes
            available_networks = [n for n in networks if len(n.nodes()) == lowest_nodes] # Create a list of networks with the lowest number of nodes
            return random.choice(available_networks) # Select one at random and put the participant in it
        else:
            return None

    def info_post_request(self,node,info):
        """Varies based on info type"""

        node.update_last_request_time()
        if info.type == "Finished":
            # Signal that the node has finished data collection. So don't fail it.
            node.finished = "Yes"
            if node.type == "Probe_node":
                # Signal that the network is finished. For the benefit of experiment_ongoing
                node.network.finished = "Yes"

    def vector_get_request(self, node, vectors):
        """Runs when a participant fails the comprehension check"""
        node.fail()
        node.network.calculate_full()
        self.save()
        self.recruit()

    def create_node(self, participant, network):
        """Create a Node for the participant. Varies based on whether the network already has a player A"""
        if network.nodes():
            node = self.models.Probe(network=network, participant=participant) # Probe = Player B
        else:
            node = self.models.Drone(network=network, participant=participant) # Drone = Player A
        node.condition = node.network.condition
        node.finished = "No"
        return node

    def add_node_to_network(self, node, network):
        """Add node to the chain and receive transmissions."""
        network.add_node(node)
        if node.type == "Probe_node":
            Drone = network.drones[0]
            Drone.transmit(what = self.models.JSON_Info)
            node.receive()

    def bonus(self, participant):
        """Calculate the participants bonus."""
        node = participant.nodes()[0]
        return 3    

    def recruit(self):
        """Recruit runs automatically when a participant finishes and will ask it to run when a participant fails too.
        If there are still unfilled networks, we recruit another participant"""
        if self.networks(full=False):
            self.recruiter.recruit(n=1)
        else:
            self.recruiter.close_recruitment()

    def award_bonus(self, bonus):
        self.log("Bonus = {}: paying bonus".format(bonus))
        self.participant.recruiter.reward_bonus(
            self.participant,
            bonus,
            self.experiment.bonus_reason(),
        )
    participant.recruiter.reward_bonus()

    @property
    def background_tasks(self):
        return [
           self.stiller_remover,
        ] 

    def Experiment_ongoing(self):
        """Is the experiment still going. Once participants reach the questionnaire, this should stop"""
        return any([n.finished != "Yes" for n in self.networks()])

    def stiller_remover(self):
        """Remove any stillers"""
        while self.Experiment_ongoing():
            gevent.sleep(2)
            for net in self.started_but_unfinished_networks():
                self.node_kicker()

    def node_kicker(self):
        for net in self.started_but_unfinished_networks():
            for n in net.nodes():
                current_time = datetime.now()
                if (current_time - n.last_request).total_seconds() > self.inactivity_time_limit and n.finished != "Yes":
                    self.log("Node booted")
                    n.fail()
                    net.calculate_full()
                    self.save()
                    self.recruit() # Replace the participant

    def started_but_unfinished_networks(self):
        return [n for n in self.networks() if n.finished != "Yes"]
