var express = require('express');
var router = express.Router();

var config = require('./../../config');

const Car = require('./../../models/cars');
const CarBooking = require('./../../models/car_booking');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');
const CarHelper = require('./../../helper/car');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
const moment = require('moment');

/**
 * @api {post} /app/car/filter List of car by filter applied
 * @apiName Filtered car List
 * @apiDescription To Display filter car list 
 * @apiGroup App - Car
 * 
 * @apiParam {Date} fromDate Available from date
 * @apiParam {Number} days Number of days car needed
 * @apiParam {Array}  [brand] Array of brand ids 
 * @apiParam {Array} [model] Array of model ids 
 * @apiParam {Boolean} [navigation] Boolean default true 
 * @apiParam {Enum} [transmission]  ["automatic", "manual"] 
 * @apiParam {Enum} [car_class]  ["economy", "luxury", "suv", "family"] 
 * @apiParam {Number} [capacity_of_people] Number no. of people 
 * @apiParam {String} [milage] String forexample: "open" 
 * @apiParam {Number} [sort_by] (eg 0 = by popularity , 1 = rent wise desc, 2 = rent wise asc)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// [ 7. Rental list]
router.post('/car-list', async (req, res) => {

    var defaultQuery = [
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'carId',
                as: "carDetails",
            }
        },
        {
            $unwind: {
                "path": "$carDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'carDetails.car_model_id',
                as: "modelDetails",
            }
        },
        {
            $unwind: {
                "path": "$modelDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_brand',
                foreignField: '_id',
                localField: 'carDetails.car_brand_id',
                as: "brandDetails",
            }
        },
        {
            $unwind: {
                "path": "$brandDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                _id: 1,
                booking_number: 1,
                userId: 1,
                carId: 1,
                // from_time: 1,
                // to_time: 1,
                car_book_from_date: {
                    $dateToString: {
                        date: "$from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$to_time",
                        format: "%Y-%m-%d"
                    }
                },
                days: 1,
                booking_rent: 1,
                trip_status: 1,
                delivery_address: 1,
                delivery_time: 1,
                total_booking_amount: 1,
                latitude: 1,
                longitude: 1,
                coupon_code: 1,
                isDeleted: 1,
                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_avialable: "$carDetails.is_avialable",
                is_delieverd: "$carDetails.is_delieverd",
                car_rental_company_id: "$carDetails.car_rental_company_id",
                no_of_person: "$carDetails.no_of_person",
                transmission: "$carDetails.transmission",
                milage: "$carDetails.milage",
                car_class: "$carDetails.car_class",
                licence_plate: "$carDetails.licence_plate",
                car_color: "$carDetails.car_color",
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",

            }
        }
    ];

    var match_object = [];
    var apply_filter = 0; // not applying now

    if (req.body.confirm_rental) { // for upcomming car default filter
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.confirm_rental })
    }
    else {
        apply_filter = 1
        match_object.push({ 'trip_status': 'upcoming' })
    }

    if (req.body.cancellation) { // for cancelled car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.cancellation })
    }

    if(req.body.deliverd_rental){ // car which is deliver to customer now come in in-progress status in db
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.deliverd_rental })
    }

    if(req.body.return){ // when customer finish their trip then he return car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.return })
    }

    if (req.body.today) {
        var searchQuery = {
            "$match": {
                car_book_from_date: req.body.today
            }
        }
        defaultQuery.splice(7, 0, searchQuery);
    }

    if (apply_filter === 1) {
        var searchQuery = {
            "$match": {
                $or: match_object
            }
        }
        defaultQuery.splice(7, 0, searchQuery);
    }

    console.log('Match Condition ====>', match_object);
    console.log('Default Query========>', JSON.stringify(defaultQuery));

    CarBooking.aggregate(defaultQuery, function (err, data) {
        if (err) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "error in fetching data",
                err
            });
        } else {
            if (data && data.length > 0) {
                var data = data.map((c) => {
                    if (c['image_name'] === undefined) {
                        c['image_name'] = null
                    }
                    return c;
                })

                res.status(config.OK_STATUS).json({
                    status: "success",
                    message: "car data found",
                    data: { cars: data },
                });
            }
            else {
                res.status(config.OK_STATUS).json({
                    status: "failed",
                    message: "No car data found"
                });
            }
        }
    });

});


// Booking details of any one car [ 8. Details of rental]
router.post('/booking-details', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking id to view details"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // req.body.booking_number

        var defaultQuery = [
            {
                $match : {
                    "booking_number" : { $eq : req.body.booking_number}
                }
            },
            {
                $lookup: {
                    from: 'cars',
                    foreignField: '_id',
                    localField: 'carId',
                    as: "carDetails",
                }
            },
            {
                $unwind: {
                    "path": "$carDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'carDetails.car_model_id',
                    as: "modelDetails",
                }
            },
            {
                $unwind: {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'carDetails.car_brand_id',
                    as: "brandDetails",
                }
            },
            {
                $unwind: {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'userId',
                    as: "userDetails",
                }
            },
            {
                $unwind: {
                    "path": "$userDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    _id: 1,
                    total_avg_rating : 1,
                    booking_number: 1,
                    userId: 1,
                    carId: 1,
                    car_book_from_date: {
                        $dateToString: {
                            date: "$from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    car_book_to_date: {
                        $dateToString: {
                            date: "$to_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    days: 1,
                    booking_rent: 1,
                    trip_status: 1,
                    delivery_address: 1,
                    delivery_time: 1,
                    total_booking_amount: 1,
                    latitude: 1,
                    longitude: 1,
                    coupon_code: 1,
                    isDeleted: 1,
                    image_name: "$carDetails.car_gallery",
                    is_navigation: "$carDetails.is_navigation",
                    is_AC: "$carDetails.is_AC",
                    is_luggage_carrier: "$carDetails.is_luggage_carrier",
                    driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                    is_avialable: "$carDetails.is_avialable",
                    is_delieverd: "$carDetails.is_delieverd",
                    car_rental_company_id: "$carDetails.car_rental_company_id",
                    no_of_person: "$carDetails.no_of_person",
                    transmission: "$carDetails.transmission",
                    milage: "$carDetails.milage",
                    car_class: "$carDetails.car_class",
                    licence_plate: "$carDetails.licence_plate",
                    car_color: "$carDetails.car_color",
                    car_brand: "$brandDetails.brand_name",
                    car_model: "$modelDetails.model_name",
                    car_model_number: "$modelDetails.model_number",
                    car_model_release_year: "$modelDetails.release_year",
                    first_name: "$userDetails.first_name",
                    last_name: "$userDetails.last_name",
                    phone_number: "$userDetails.phone_number",
                    country_code: "$userDetails.country_code",
                    email: "$userDetails.email"
                }
            },
            {
                $lookup: {
                    from: 'car_reviews',
                    localField: 'carId', // from projection
                    foreignField: 'car_id',
                    as: 'reviews'
                }
            },
            {
                $unwind: {
                    "path": "$reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $group: {
                    _id: "$_id",
                    total_avg_rating: { $avg: "$reviews.stars" },
                    car: { "$first": "$$ROOT" }
                }
            },
            
        ];
        console.log('Default Query========>', JSON.stringify(defaultQuery));

        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "error in accured while fetching booking car details by booking number",
                    err
                });
            } else {
                if (data && data.length > 0) {
                    var data = data.map((c) => {
                        if (c.car['image_name'] === undefined) {
                            c.car['image_name'] = null
                        }
                        c.car['total_avg_rating'] = c.total_avg_rating;
                        delete c.car.reviews;
                        return c.car;
                    })
              
                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "Car booking details has been found",
                        data: { cars: data },
                    });
                }
                else {
                    res.status(config.OK_STATUS).json({
                        status: "failed",
                        message: "No car booking details found"
                    });
                }
            }
        });
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }

});

// car handover
router.post('/handover', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }
    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {
    
        var hand_over_data = {
            'user_id' : req.body.user_id,
            'car_id' : req.body.car_id,
            'agent_id' : req.body.agent_id,
            'defected_points' : req.body.defected_points,
            'milage' : req.body.milage, 
            'petrol_tank' : req.body.petrol_tank,
            'notes' : req.body.notes ? req.body.notes : null,
            'booking_number' : req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }

        const carHandOverResp = await CarHelper.car_handover(req, hand_over_data);
        console.log('RESP=>',carHandOverResp);
        res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});





module.exports = router;