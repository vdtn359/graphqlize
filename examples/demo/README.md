Demo: https://7r24icf3m52q5ywlk47crnmrci0nlugb.lambda-url.ap-southeast-2.on.aws/graphql

Display the first and last names of all actors from the table actor.

```bash
query {
  listActors {
    records {
      firstName
      lastName
    }
  }
}
```

You need to find the ID number, first name, and last name of an actor, of whom you know only the first name, "Joe." What is one query would you use to obtain this information?

```bash
query {
  listActors(filter: { firstName: { _iLike: "joe" }}) {
    records {
      firstName
      lastName
      actorId
    }
  }
}
```

Find all actors whose last name contain the letters GEN:
```bash
query {
  listActors(filter: { lastName: { _iLike: "%GEN%" }}) {
    records {
      firstName
      lastName
      actorId
    }
  }
}
```

Find all actors whose last names contain the letters LI. This time, order the rows by last name and first name, in that order:

```bash
query {
  listActors(filter: { lastName: { _iLike: "%LI%" }}, sort: [
    {
      lastName: {
        direction: ASC
      }
    },
    {
      firstName: {
        direction: ASC
      }
    }
  ]) {
    records {
      firstName
      lastName
      actorId
    }
  }
}
```

Using IN, display the country_id and country columns of the following countries: Afghanistan, Bangladesh, and China:


```bash
query {
  listCountries(filter: { country: { _in : ["Afghanistan", "Bangladesh", "China"] }}) {
    records {
      country
      countryId
    }
  }
}
```

List the last names of actors, as well as how many actors have that last name. Only show the names that are shared by at least two actors

```bash
{
  aggregateActors(
    groupBy: {lastName: true}
    sort: [{_count: {_all: {direction: DESC}}}, {lastName: {direction: ASC}}]
    having: { _count: { _all: { _gt: 1 }}}
  ) {
    records {
      count {
        actorId
      }
      group
    }
  }
}
```

Use JOIN to display the first and last names, as well as the address, of each staff member. Use the tables staff and address:
```bash
query {
 	listStaffList {
    records {
      firstName
      lastName
      address {
        address
        district
        postalCode
      }
    }
  }
}
```

Use JOIN to display the total amount rung up by each staff member in August of 2005. Use tables staff and payment.
```bash
{
  aggregatePayments(
    filter: {paymentDate: {_year: {_eq: 2005}, _month: {_eq: 8}}}
    groupBy: {staff: {firstName: true, lastName: true}}
  ) {
    records {
      group
      sum {
        amount
      }
    }
  }
}
```


Use subqueries to display all actors who appear in the film Alone Trip.
```bash
{
  listActors(filter: {filmActors: {film: {title: {_iLike: "Alone Trip"}}}}) {
    records {
      firstName
      lastName
    }
  }
}
```

You want to run an email marketing campaign in Canada, for which you will need the names and email addresses of all Canadian customers. Use joins to retrieve this information.
```bash
{
  listCustomers(filter: { address: { city: { country: { country: { _eq: "Canada"}}}}}) {
    records{
      firstName
      lastName
      email
    }
  }
}
```
Sales have been lagging among young families, and you wish to target all family movies for a promotion. Identify all movies categorized as family films.
```bash
{
  listFilms(filter: { filmCategories: { category: { name: { _eq: "Family" }}}}) {
    records {
      filmId
      title
      releaseYear
    }
  }
}
```

Display the most frequently rented movies in descending order.
```bash
{
  aggregateRentals(
    groupBy: {inventory: {film: {filmId: true, title: true}}}
    sort: [{_count: {rentalId: {direction: DESC}}}]
  ) {
    records {
      group
      count {
        rentalId
      }
    }
  }
}
```

In your new role as an executive, you would like to have an easy way of viewing the Top five genres by gross revenue
```bash
{
  aggregatePayments(
    groupBy: {rental: {inventory: {film: {filmCategories: {category: {name: true}}}}}}
    filter: {amount: {_gt: 0}, rental: {inventory: {film: {filmCategories: {category: {_required: true}}}}}}
    pagination: { limit: 5 },
    sort: [{ _sum: { amount: { direction: DESC }}}]
  ) {
    records {
      group
      sum {
        amount
      }
    }
  }
}
```
