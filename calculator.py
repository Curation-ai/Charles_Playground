"""
Simple calculator module with utility functions
"""

def divide_numbers(a, b):
    """Divide two numbers"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def get_average(numbers):
    """Calculate average of a list of numbers"""
    total = sum(numbers)
    return total / len(numbers)  # Bug: will crash if numbers is empty

def find_element(arr, index):
    """Get element at index from array"""
    # TODO: Add bounds checking
    return arr[index]  # Potential IndexError

def process_user_data(data):
    """Process user data dictionary"""
    name = data['name']  # Bug: KeyError if 'name' doesn't exist
    age = data['age']    # Bug: KeyError if 'age' doesn't exist
    return f"{name} is {age} years old"

def calculate_discount(price, discount_percent):
    """Calculate discounted price"""
    discount = price * discount_percent / 100
    return price - discount
