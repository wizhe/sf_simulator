import random
import statistics
from multiprocessing import pool

# Success rates (star increases)
success_rates = {
    0: 95,
    1: 90,
    2: 85,
    3: 85,
    4: 80,
    5: 75,
    6: 70,
    7: 65,
    8: 60,
    9: 55,
    10: 50,
    11: 45,
    12: 40,
    13: 35,
    14: 30,
    15: 30,
    16: 30,
    17: 15,
    18: 15,
    19: 15,
    20: 30,
    21: 15,
    22: 15,
    23: 10,
    24: 10,
    25: 10,
    26: 7,
    27: 5,
    28: 3,
    29: 1
}

# Fail rates (star stays the same) (Not used)
fail_rates = {
    0: 5,
    1: 10,
    2: 15,
    3: 15,
    4: 20,
    5: 25,
    6: 30,
    7: 35,
    8: 40,
    9: 45,
    10: 50,
    11: 55,
    12: 60,
    13: 65,
    14: 70,
    15: 67.9,
    16: 67.9,
    17: 78.2,
    18: 78.2,
    19: 76.5,
    20: 59.5,
    21: 72.25,
    22: 68,
    23: 72,
    24: 72,
    25: 72,
    26: 74.4,
    27: 76,
    28: 77.6,
    29: 79.2
}

# Boom rates (star drops to certain value)
boom_rates = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 2.1,
    16: 2.1,
    17: 6.8,
    18: 6.8,
    19: 8.5,
    20: 10.5,
    21: 12.75,
    22: 17,
    23: 18,
    24: 18,
    25: 18,
    26: 18.6,
    27: 19,
    28: 19.4,
    29: 19.8
}

# Boom results (What star an item will have after a boom)
boom_result =  {
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 15,
    21: 17,
    22: 17,
    23: 19,
    24: 19,
    25: 19,
    26: 20,
    27: 20,
    28: 20,
    29: 20,
}

# Build Cost Table, for quicker retrieval of costs
def build_cost_table (item_level: int, max: int = 29):
    cost_table = [0] * (max + 1)

    # Stars 0-9, linear section
    for star in range(0, min(10, max + 1)):
        x = star + 1
        cost_table[star] = 100 * round(10 + (item_level**3 * x)/2500)

    # Stars 10-29, specific values
    vals = {
        10: (11, 40000),
        11: (12, 22000),
        12: (13, 15000),
        13: (14, 11000),
        14: (15, 7500),
        15: (16, 20000),
        16: (17, 20000),
        17: (18, 15000),
        18: (19, 7000),
        19: (20, 4500),
        20: (21, 20000),
        21: (22, 12500),
        22: (23, 20000),
        23: (24, 20000),
        24: (25, 20000),
        25: (26, 20000),
        26: (27, 20000),
        27: (28, 20000),
        28: (29, 20000),
        29: (30, 20000),
    }

    for star, (x, y) in vals.items():
        if star > max:
          continue
        cost_table[star] = 100 * round(10 + (item_level**3 * (x**2.7))/ y)

    return cost_table

# Simulate Runs
def simulate_runs(target=22, 
                  start=0, 
                  n_runs = 100, 
                  item_level=150, 
                  starcatch=False, 
                  safeguard=False, 
                  event_30_off=False, 
                  event_30_boom_reduction=False):
    total_cost = []
    total_booms = []
    cost_table = build_cost_table(item_level, target)

    for _ in range(n_runs):
        star = start
        cost = 0
        run_cost = 0
        boom_count = 0
        
        # 30% Off Costs Event
        event_discount = 0.3 if event_30_off else 0
        
        # 30% Boom Chance Reduction Event (multiplicative)
        event_boom_reduction = 0.3 if event_30_boom_reduction else 0
        
        # Starcatching (+5% multiplicative success chance)
        starcatch_bonus = 0.05 if starcatch else 0

        while (star < target):
            # Safeguard (Reduce boom chance to 0% but adds 200% cost, only up to 18th star)
            if safeguard and 15 <= star < 18:
                safeguard_boom_reduction = 1 # 100% reduction
                safeguard_cost = 2 # 200% increase
            else:
                safeguard_cost = 0
                safeguard_boom_reduction = 0

            roll = random.randint(1,10000)/100
            suc = success_rates[star] * (1 + starcatch_bonus)
            boom = boom_rates[star] * (1 - event_boom_reduction) * (1 - safeguard_boom_reduction)
            cost = cost_table[star] * (1 - event_discount) * (1 + safeguard_cost)

            if roll <= suc: # Success
                star += 1 # Star goes up
            
            elif ((star >= 15) and (roll > suc) and (roll <= suc+boom)): # Boom
                star = boom_result[star]
                boom_count += 1
            
            else: # Fail
                pass # Star stays the same
            
            run_cost += cost
        total_cost.append(run_cost)
        total_booms.append(boom_count)
    
    avg_cost = sum(total_cost)/n_runs
    median_cost = statistics.median(total_cost)
    avg_booms = sum(total_booms)/n_runs
    median_booms = statistics.median(total_booms)

    return int(avg_cost), int(median_cost), avg_booms, median_booms, total_cost

