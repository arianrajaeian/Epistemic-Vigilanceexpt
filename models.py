<<<<<<< Updated upstream
from dallinger.networks import Chain
from dallinger.models import Node, Info
import random
from datetime import datetime
from operator import attrgetter

class RChain(Chain):
    """Custom Chain network with properties"""

    __mapper_args__ = {"polymorphic_identity": "RChain"}

    @property
    def finished(self):
        return self.property1

    @finished.setter
    def finished(self,val):
        self.property1 = val 

    @property
    def condition(self):
        return self.property2

    @condition.setter
    def condition(self,val):
        self.property2 = val

    @property
    def drones(self):
        return self.nodes(type=Drone)    

class DroneProbe(Node):

    __mapper_args__ = {"polymorphic_identity": "DroneProbe_node"}

    def __init__(self, network, participant=None):
        super().__init__(network, participant)

        self.details = {
            "last_request": str(datetime.now())
        }

    @property
    def last_request(self):
        return datetime.strptime(self.details["last_request"], "%Y-%m-%d %H:%M:%S.%f")

    @last_request.setter
    def last_request(self, val):
        details = self.details.copy()
        details["last_request"] = str(val)
        self.details = details

    def update_last_request_time(self):
        if self.failed:
            raise ValueError("Cannot update last request for Player {} as it has failed.".format(self.id))
        self.last_request = datetime.now()

    @property
    def finished(self):
        return self.property1

    @finished.setter
    def finished(self,val):
        self.property1 = val    

    @property
    def condition(self):
        return self.property2

    @condition.setter
    def condition(self,val):
        self.property2 = val

    @property
    def score(self):
        return self.property3

    @score.setter
    def score(self,val):
        self.property3 = val 

class Drone(DroneProbe):
    """Node used for player A in the experiment"""

    __mapper_args__ = {"polymorphic_identity": "Drone_node"}

class Probe(DroneProbe):
    """Node used for player B in the experiment"""

    __mapper_args__ = {"polymorphic_identity": "Probe_node"}

class Answer_Info(Info):
    """Info used to record whether the players got the answer correct or incorrect"""
    __mapper_args__ = {"polymorphic_identity": "Answer_Info"}

class Comp_Info(Info):
    """Info used to record how many tries participants took to get the comprehension check correct."""
    __mapper_args__ = {"polymorphic_identity": "Comp_Info"}

class First_guess(Info):
    """Info used for player B making their first guess"""

    __mapper_args__ = {"polymorphic_identity": "First_guess"}

class Second_guess(Info):
    """Info used for player B making their first guess"""

    __mapper_args__ = {"polymorphic_identity": "Second_guess"}

class Social_info(Info):
    """Info used to record the value and kind of social information that player B saw"""

    __mapper_args__ = {"polymorphic_identity": "Social_info"}

class JSON_Info(Info):
    """Info used by player A for the information to transmit to player B."""

    __mapper_args__ = {"polymorphic_identity": "JSON_Info"}

class Finished(Info):
    """Info used to signal that the experiment network is done."""

    __mapper_args__ = {"polymorphic_identity": "Finished"}
=======
>>>>>>> Stashed changes
