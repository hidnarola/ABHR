var mongoose = require('mongoose');
var CarReview = require('./../models/car_review');
var ObjectId = mongoose.Types.ObjectId;
const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
const User = require('./../models/users');
const CarAssign = require('./../models/car_assign_agent');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const Country = require('./../models/country');
const State = require('./../models/state');
const City = require('./../models/city');
const CarHandOver = require('./../models/car_hand_over');
const CarReceive = require('./../models/car_receive');
const CarReport = require('./../models/car_report');
const CarVAT = require('./../models/car_vat');
const invoiceHelper = require('../helper/inovice');
const moment = require('moment');
const _ = require('underscore');
var config = require('./../config');
var fs = require('fs');
var paths = require('path');
var async = require("async");

let carHelper = {};
let mail_helper = require('./mail');

carHelper.getAvailableCar = async function (fromDate, days, start = 0, length = 10) {

    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
    console.log(toDate);

    var defaultQuery = [
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'car_model_id',
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
                localField: 'car_brand_id',
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
                from: 'car_booking',
                foreignField: 'carId',
                localField: '_id',
                as: "carBookingDetails",
            }
        },
        {
            $unwind: {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                _id: 1,
                vat_rate: 1,
                car_rental_company_id: 1,
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",
                car_color: 1,
                rent_price: 1,
                is_AC: 1,
                is_luggage_carrier: 1,
                licence_plate: 1,
                no_of_person: 1,
                transmission: 1,
                is_delieverd: 1,
                milage: 1,
                is_navigation: 1,
                driving_eligibility_criteria: 1,
                car_class: 1,
                is_available: 1,
                car_model_id: 1,
                car_brand_id: 1,
                isDeleted: 1,
                image_name: "$car_gallery.name" ? { $arrayElemAt: ["$car_gallery.name", 0] } : null,
                car_book_from_date: {
                    $dateToString: {
                        date: "$carBookingDetails.from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$carBookingDetails.to_time",
                        format: "%Y-%m-%d"
                    }
                }
            }
        },
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { car_book_from_date: { $gt: toDate } },
                            { car_book_to_date: { $lt: fromDate } },
                            { car_book_from_date: { $eq: null } }
                        ]
                    },
                    { isDeleted: false }
                ]
            }
        },
        {
            $skip: start
        },
        {
            $limit: length
        },
        {
            $lookup: {
                from: 'car_reviews',
                localField: '_id',
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
        }
    ];
    try {
        console.log("Default Query => ", JSON.stringify(defaultQuery));
        let cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {

            cars = cars.map((c) => {
                c.car["total_avg_rating"] = c.total_avg_rating;
                delete c.car.reviews;
                return c.car;
            })

            return { status: 'success', message: "Car data found", data: { cars: cars } }
        } else {
            return { status: 'failed', message: "No car data found" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


carHelper.getcarDetailbyId = async (car_id,lan_id) => {
    if(lan_id == 6){
        var terms = "$termandconditionDetails.terms_and_conditions";
    }else{
        var terms = "$termandconditionDetails.terms_and_conditions_arabic";
    }
    var defaultQuery = [
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'car_model_id',
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
                localField: 'car_brand_id',
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
                from: 'car_company_terms_and_condition',
                foreignField: 'CompanyId',
                localField: 'car_rental_company_id',
                as: "termandconditionDetails",
            }
        },
        {
            $unwind: {
                "path": "$termandconditionDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_company',
                foreignField: '_id',
                localField: 'car_rental_company_id',
                as: "carCompanyDetails",
            }
        },
        {
            $unwind: {
                "path": "$carCompanyDetails",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            $project: {
                _id: 1,
                car_rental_company_id: 1,
                car_rental_company_name: "$carCompanyDetails.name",
                car_rental_company_country: "$carCompanyDetails.company_address.country",
                terms_and_conditions: terms,
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",
                car_color: 1,
                rent_price: 1,
                is_AC: 1,
                is_luggage_carrier: 1,
                licence_plate: 1,
                no_of_person: 1,
                transmission: 1,
                is_delieverd: 1,
                milage: 1,
                is_navigation: 1,
                driving_eligibility_criteria: 1,
                car_class: 1,
                is_available: 1,
                car_model_id: 1,
                car_brand_id: 1,
                isDeleted: 1,
                car_gallery: 1,
                resident_criteria: 1,
                deposit: 1,
                age_of_car: 1,
                image_name: { $arrayElemAt: ["$car_gallery.name", 0] },
            }
        },
        {
            $match: {
                'isDeleted': false,
                '_id': car_id
            }
        },
        {
            $lookup: {
                from: 'car_reviews',
                localField: '_id',
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
        }
    ];
    try {
        let carDetail = await Car.aggregate(defaultQuery);

        if (carDetail && carDetail.length > 0) {

            const vat = await CarVAT.findOne({}, { rate: 1 });
            console.log('VAT=>', vat);

            var cars = carDetail.map((c) => {
                c.car["total_avg_rating"] = c.total_avg_rating;
                // c.car["car_rental_company_name"] = c.car_rental_company_name;
                if (c.car['image_name'] === undefined) {
                    c.car['image_name'] = null
                }
                if (c.car['car_gallery'] === undefined) {
                    c.car['car_gallery'] = []
                }
                if (c.car['terms_and_conditions'] === undefined) {
                    c.car['terms_and_conditions'] = null
                }
                if (c.car['car_rental_company_country'] === undefined) {
                    c.car['car_rental_company_country'] = null
                }
                c.car['vat'] = vat ? vat.rate : null
                delete c.car.reviews;
                return c.car;
            })
            return { status: 'success', message: "Car data found", data: { carDetail: cars[0] } }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

carHelper.getcarDetails = async (car_id) => {
    console.log('Dm here');
    var defaultQuery = [
        {
            $match: {
                'isDeleted': false,
                '_id': new ObjectId(car_id)
            }
        },
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'car_model_id',
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
                localField: 'car_brand_id',
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
                from: 'car_company',
                foreignField: '_id',
                localField: 'car_rental_company_id',
                as: "carCompanyDetails",
            }
        },
        {
            $unwind: {
                "path": "$carCompanyDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_booking',
                foreignField: 'carId',
                localField: '_id',
                as: "carBookingDetails",
            }
        },
        {
            $unwind: {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $match: {
                "carBookingDetails.trip_status": { $ne: "finished" },
                "carBookingDetails.trip_status": { $ne: "cancelled" }
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "car_rental_company_id": { "$first": "$car_rental_company_id" },
                "car_brand_id": { "$first": "$car_brand_id" },
                "car_model_id": { "$first": "$car_model_id" },
                "milage": { "$first": "$milage" },
                "car_rental_company_name": { "$first": "$carCompanyDetails.name" },
                "car_rental_company_country": { "$first": "$carCompanyDetails.company_address.country" },
                "car_model": { "$first": "$modelDetails.model_name" },
                "car_brand": { "$first": "$brandDetails.brand_name" },
                "car_model_number": { "$first": "$modelDetails.model_number" },
                "car_color": { "$first": "$car_color" },
                "rent_price": { "$first": "$rent_price" },
                "is_AC": { "$first": "$is_AC" },
                "is_luggage_carrier": { "$first": "$is_luggage_carrier" },
                "licence_plate": { "$first": "$licence_plate" },
                "no_of_person": { "$first": "$no_of_person" },
                "transmission": { "$first": "$transmission" },
                "is_navigation": { "$first": "$is_navigation" },
                "driving_eligibility_criteria": { "$first": "$driving_eligibility_criteria" },
                "car_class": { "$first": "$car_class" },
                "car_gallery": { "$first": "$car_gallery" },
                "resident_criteria": { "$first": "$resident_criteria" },
                "deposit": { "$first": "$deposit" },
                "age_of_car": { "$first": "$age_of_car" },
                "availableData": { "$first": "$is_available" },
                "carBookingDetails": { $push: "$carBookingDetails" },
            }
        },
        {
            $project: {
                _id: 1,
                car_rental_company_id: 1,
                car_rental_company_name: 1,
                car_rental_company_country: 1,
                car_brand: 1,
                car_model: 1,
                car_model_number: 1,
                car_model_release_year: 1,
                car_color: 1,
                rent_price: 1,
                is_AC: 1,
                is_luggage_carrier: 1,
                licence_plate: 1,
                no_of_person: 1,
                transmission: 1,
                is_delieverd: 1,
                milage: 1,
                is_navigation: 1,
                driving_eligibility_criteria: 1,
                car_class: 1,
                availableData: 1,
                car_model_id: 1,
                car_brand_id: 1,
                car_gallery: 1,
                resident_criteria: 1,
                deposit: 1,
                age_of_car: 1,
                carBookingDetails: 1
            }
        }
    ];
    try {
        let carDetail = await Car.aggregate(defaultQuery);
        // console.log("Car Details =>",carDetail);
        if (carDetail && carDetail.length > 0) {
            console.log(carDetail[0].carBookingDetails);
            if (carDetail[0].carBookingDetails && carDetail[0].carBookingDetails.length > 0) {
                var BookingDetail = carDetail[0].carBookingDetails;

                var DisabledDates = [];

                BookingDetail.forEach((Booking) => {
                    let fromDate = moment(Booking.from_time).utc().startOf('days');
                    let toDate = moment(Booking.to_time).utc().startOf('days');
                    // console.log("Fromdate>>>>",fromDate)
                    // console.log("ToDate>>>>",toDate)
                    var dmData = []; // dm
                    var cnt = 0;
                    var fromMnth = 1 + moment(fromDate).month(); // dm
                    while (!(moment(fromDate).isSame(toDate))) {
                        // console.log("coming here...");
                        var fromMonth = 1 + moment(fromDate).month();
                        if (carDetail[0].availableData && carDetail[0].availableData.length > 0) {
                            var availableData = carDetail[0].availableData;
                            availableData.forEach((calender, i) => {
                                if (calender.month === fromMonth) {
                                    if (calender.availability && calender.availability.length > 0) {
                                        var calenderDates = calender.availability;
                                        calenderDates.forEach((Dates, j) => {
                                            var tempDate = moment(Dates).utc().startOf('days');
                                            if (moment(tempDate).isSame(fromDate)) {
                                                if (dmData.indexOf(fromDate) === -1) {
                                                    dmData.push(fromDate);
                                                }
                                                delete carDetail[0].availableData[i].availability[j];
                                                // carDetail[0].availableData[i].availability[j] = null;
                                            }

                                            // console.log('Dates=====>', Dates);
                                        });

                                    }
                                }

                                else {
                                    if (dmData.indexOf(fromDate) === -1) {
                                        // DisabledDates.push(fromDate);
                                        dmData.push(fromDate);
                                    }
                                }

                            });
                        }
                        fromDate = moment(fromDate).add(1, 'days');
                    }


                    // dm here
                    // DisabledDates.push({ 'month': fromMnth, availability: dmData }); // before
                    var flag = 0;
                    if (DisabledDates && DisabledDates.length === 0) {
                        DisabledDates.push({ 'month': fromMnth, availability: dmData });
                    }
                    else {
                        DisabledDates.forEach((item, i) => {
                            if (item.month === fromMnth) {
                                flag = 1;
                                // console.log('come inside loop')
                                dmData.forEach((d, i) => {
                                    item.availability.push(d);
                                })
                            }
                            else {
                                flag = 0;
                            }
                        })
                        if (flag === 0) {
                            DisabledDates.push({ 'month': fromMnth, availability: dmData });
                        }
                    }

                });

                carDetail[0].disabledDates = DisabledDates; // before

            }


            // carDetail[0].disabledDates = DisabledDates;

            return { status: 'success', message: "Car data found", data: carDetail }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        console.log("Query error=>", err);
        return { status: 'failed', message: "Error occured while fetching car list", err };
    }
};


// Add car review
carHelper.addReview = async function (review_data) {
    let car_review = new CarReview(review_data);
    try {
        let dt = await CarReview.find({
            $and: [
                { car_id: new ObjectId(review_data.car_id) },
                { user_id: new ObjectId(review_data.user_id) }
            ]
        });

        if (dt && dt.length > 0) {
            return { status: 'failed', message: "You have all ready given review to this car" }
        }
        else {
            let data = await car_review.save();
            return { status: 'success', message: "Car review has been added", data: data }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while adding car review" };
    }
};

// Add car review
carHelper.addReview_new = async function (review_data,lan_id) {
    let car_review = new CarReview(review_data);
    try {
        let dt = await CarReview.find({
            $and: [
                { car_id: new ObjectId(review_data.car_id) },
                { user_id: new ObjectId(review_data.user_id) }
            ]
        });

        if (dt && dt.length > 0) {

            if(lan_id == 7){
                return { status: 'failed', message: "لديك كل استعداد معين نظرا لهذه السيارة" }
            }else{
                return { status: 'failed', message: "You have all ready given review to this car" }
            }
           
        }
        else {
            let data = await car_review.save();
            if(lan_id == 7){
                return { status: 'success', message: "تمت إضافة مراجعة السيارة", data: data }
            }else{
                return { status: 'success', message: "Car review has been added", data: data }
            }
           
        }
    } catch (err) {
        if(lan_id == 7){
            return { status: 'failed', message: "حدث خطأ أثناء إضافة مراجعة السيارة" };
        }else{
            return { status: 'failed', message: "Error occured while adding car review" };
        }
       
    }
};

// get car reviews
carHelper.getCarReviews = async (datta) => {
    try {
        let is_reviewed; // true / false
        let data = await CarReview.find({ car_id: new ObjectId(datta.car_id) }).lean().exec();

        if (datta.user_id !== undefined) {
            // re-arrang data
            var reviewObj = _.find(data, function (o) { return o.user_id == datta.user_id });

            if (reviewObj != undefined) { // if user review find
                var i = _.findIndex(data, function (o) { return o == reviewObj })
                data.splice(i, 1); // array
                data.unshift(reviewObj);
                is_reviewed = true
            }
            else {
                is_reviewed = false
            }
        }
        if (data && data.length > 0) {
            if (datta.user_id !== undefined) {
                return { status: 'success', message: "Car review has been found", data: { reviews: data, is_reviewed: is_reviewed } }
            }
            else {
                return { status: 'success', message: "Car review has been found", data: { reviews: data } }
            }
        }
        else {
            return { status: 'failed', message: "No car reviews yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car reviews" };
    }
};

// car sorting
carHelper.carSorting = async (sort_by) => {
    let data;
    let message;
    try {
        if (sort_by === 0) {
            data = await Car.aggregate([
                {
                    $lookup: {
                        from: 'car_reviews',
                        localField: '_id',
                        foreignField: 'car_id',
                        as: 'reviews'
                    }
                },
                {
                    $unwind: {
                        "path": "$reviews",
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        total_avg_rating: { $avg: "$reviews.stars" },
                        car: { "$first": "$$ROOT" }
                    }
                },
                {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            ]);
            message = "Sorted cars by their popularity";
        }
        else if (sort_by === 1) {
            data = await Car.find({}).sort({ 'rent_price': 1 }).lean().exec();
            message = "Sorted cars by their rent price from low to high";
        }
        else if (sort_by === 2) {
            data = await Car.find({}).sort({ 'rent_price': -1 }).lean().exec();
            message = "Sorted cars by their rent price from high to low";
        }

        if (data && data.length > 0) {
            return { status: 'success', message: message, data: data }
        }
        else {
            return { status: 'failed', message: "No cars available", data: data }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while sorting cars" };
    }
};

// Car Booking past history 
carHelper.carBooking_past_history = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_details.car_model_id',
                    as: 'model_details'
                }
            },
            {
                $unwind: {
                    "path": "$model_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_details.car_brand_id',
                    as: 'brand_details'
                }
            },
            {
                $unwind: {
                    "path": "$brand_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year"
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId('5c2461eea3e4c014baafb01f'),
                //     'from_time': {
                //         $lt: new Date(),
                //     }
                // }
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'trip_status': "finished"
                }
            }
        ]);
        if (data && data.length > 0) {

            // console.log('DATA=>',data);

            // var dataa = data.map((d)=>{
            //     return delete d['model_details'];
            // })
            return { status: 'success', message: "Car booking past history", data: { past_history: data } }
        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking past history" };
    }
};

// Car Booking upcoming history 
carHelper.carBooking_upcomming_history = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_details.car_model_id',
                    as: 'model_details'
                }
            },
            {
                $unwind: {
                    "path": "$model_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_details.car_brand_id',
                    as: 'brand_details'
                }
            },
            {
                $unwind: {
                    "path": "$brand_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: '_id',
                    as: 'companyDetails'
                }
            },
            {
                $unwind: {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company_terms_and_condition',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: 'CompanyId',
                    as: 'car_company_terms_and_condition_Details'
                }
            },
            {
                $unwind: {
                    "path": "$car_company_terms_and_condition_Details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year",
                    "car_details.terms_and_conditions": "$car_company_terms_and_condition_Details.terms_and_conditions",
                    // "phone_number": "$companyDetails.phone_number"
                }
            },
            {
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'from_time': {
                        $gt: new Date(),
                    },
                    'trip_status': { $nin: ['cancelled', 'finished'] }
                }
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId(user_id),
                //     'trip_status': "upcoming"
                // }
            },
            {
                $sort: { 'from_time': 1 }
            }

        ]);
        if (data && data.length > 0) {

            console.log('DATA===>', data);
            // var currentDate = moment(Date.now()).format('YYYY-MM-DD');
            var currentDate = moment().toDate().toISOString(Date.now());
            console.log('C Date=>', currentDate);
            console.log('C Date IOS=>', moment().toDate().toISOString(Date.now()))

            // console.log('MOment Db Date = >', moment("2019-01-28T05:19:50.975Z"))
            // console.log('MOment Current Date = >', moment());

            var phone_no = await User.findOne({ type: 'admin', isDeleted: false }, { _id: 0, support_phone_number: 1 }).lean().exec();
            var support_phone_number = phone_no != null ? phone_no.support_phone_number : '9876543210';

            var data1 = data.map((c) => {
                // if(moment().diff(moment(c['from_time'])) > 0)
                if (moment(currentDate) >= moment(c['from_time'])) {
                    c['call_or_not'] = 'yes' // place manual call
                }
                else {
                    c['call_or_not'] = 'no' // not call 
                }
                // if (c['phone_number'] === undefined) {
                //     c['phone_number'] = "9876543210" // dummy
                // }

                c['phone_number'] = support_phone_number; // dynamic

                if (c['vat'] === undefined) {
                    c['vat'] = null
                }

                // delete c.model_details;
                // delete c.brand_details;
                // delete c.companyDetails;

                return c;
            })

            return { status: 'success', message: "Car booking upcomming history", data: { upcoming_history: data1 } }

        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking upcomming history" };
    }
};


// Car Booking all history 
carHelper.history = async (user_id, history_type) => {

    var defaultQuery = [
        {
            $lookup: {
                from: 'cars',
                localField: 'carId',
                foreignField: '_id',
                as: 'car_details'
            }
        },
        {
            $unwind: {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'car_details.car_model_id',
                as: 'model_details'
            }
        },
        {
            $unwind: {
                "path": "$model_details",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_brand',
                foreignField: '_id',
                localField: 'car_details.car_brand_id',
                as: 'brand_details'
            }
        },
        {
            $unwind: {
                "path": "$brand_details",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_company',
                localField: 'car_details.car_rental_company_id',
                foreignField: '_id',
                as: 'companyDetails'
            }
        },
        {
            $unwind: {
                "path": "$companyDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_company_terms_and_condition',
                localField: 'car_details.car_rental_company_id',
                foreignField: 'CompanyId',
                as: 'car_company_terms_and_condition_Details'
            }
        },
        {
            $unwind: {
                "path": "$car_company_terms_and_condition_Details",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $addFields: {
                "car_details.car_brand": "$brand_details.brand_name",
                "car_details.car_model": "$model_details.model_name",
                "car_details.car_model_number": "$model_details.model_number",
                "car_details.car_model_release_year": "$model_details.release_year",
                "car_details.terms_and_conditions": "$car_company_terms_and_condition_Details.terms_and_conditions",
                // "phone_number": "$companyDetails.phone_number"
            }
        }
        // {
        //     $match: {
        //         'isDeleted': false,
        //         'userId': new ObjectId(user_id),
        //         'trip_status': "upcoming"
        //     }
        // }
    ]


    if (history_type === 'all') {
        var searchQuery = {
            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id),
                // 'trip_status': { $in: ['finished'] }
                // 'trip_status': { $ne: "upcoming" }
                'from_time': {
                    $lte: new Date(),
                },
            }
        }
    }
    else if (history_type === 'active') {
        var searchQuery = {

            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id),
                // add later
                // 'from_time': {
                //     $eq: moment().utcOffset(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISOString()
                // },
                'from_time': {
                    $lte: new Date(),
                },
                'trip_status': { $nin: ['cancelled', 'finished'] }
            }
        }
    }
    else if (history_type === 'cancelled') {
        var searchQuery = {
            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id),
                'trip_status': 'cancelled'
            }
        }
    }


    defaultQuery.push(searchQuery);

    // sorting
    var sortData = {
        $sort: { 'from_time': -1 }
    }

    defaultQuery.push(sortData);

    console.log('Default Query :-', JSON.stringify(defaultQuery));

    try {
        let data = await CarBooking.aggregate(defaultQuery);

        if (data && data.length > 0) {

            var currentDate = moment().toDate().toISOString(Date.now());

            var phone_no = await User.findOne({ type: 'admin', isDeleted: false }, { _id: 0, support_phone_number: 1 }).lean().exec();
            var support_phone_number = phone_no != null ? phone_no.support_phone_number : '9876543210';

            var data1 = data.map((c) => {
                // if(moment().diff(moment(c['from_time'])) > 0)
                if (moment(currentDate) >= moment(c['from_time'])) {
                    c['call_or_not'] = 'yes' // place manual call
                }
                else {
                    c['call_or_not'] = 'no' // not call 
                }
                // if (c['phone_number'] === undefined) {
                //     c['phone_number'] = "9876543210" // dummy super admin
                // }
                c['phone_number'] = support_phone_number; // dynamic

                if (c['vat'] === undefined) {
                    c['vat'] = null
                }

                // delete c.model_details;
                // delete c.brand_details;
                // delete c.companyDetails;

                return c;
            })

            return { status: 'success', message: "History has been found", data: { history: data1 } }
        }
        else {
            return { status: 'failed', message: "History has not been found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking history" };
    }
};


carHelper.getBrandList = async () => {
    try {
        const carbrand = await CarBrand.find({ "isDeleted": false }, { _id: 1, brand_name: 1 }).collation({ locale: "en" }).sort({ "brand_name": 1 });
        if (carbrand && carbrand.length > 0) {
            return { status: 'success', message: "Car brand has been found", data: { brand: carbrand } }
        } else {
            return { status: 'failed', message: "No car brand available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car brand", err };
    }
}

//Get modellist by brand id
carHelper.getModelList = async (brandArray) => {
    try {
        const carmodels = await CarModel.find({ "isDeleted": false, "car_brand_id": { $in: brandArray } }).collation({ locale: "en" }).sort({ "model_name": 1 });
        if (carmodels && carmodels.length > 0) {
            return { status: 'success', message: "Car Models has been found", data: { model: carmodels } }
        } else {
            return { status: 'failed', message: "No car model available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Oops! Something went wrong.., We canot find data", err };
    }
}

//Get notification by user id
carHelper.getNotificationByUserId = async (userId) => {
    try {
        CarNotification.find({ "isDeleted": false, "userId": new ObjectId(req.body.userId) }, (err, data) => {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "notification data not found",
                    err
                });
            } else {
                res.status(config.OK_STATUS).json({
                    status: "Success",
                    message: "notification data found",
                    data: data,
                });
            }
        });
        const carnotifications = await CarNotification.find({ "isDeleted": false, "userId": new ObjectId(userId) });
        if (carnotifications && carnotifications.length > 0) {
            return { status: 'success', message: "Car Notification records found", data: { carnotifications: carnotifications } }
        } else {
            return { status: 'failed', message: "Car Notification records not available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Oops! Something went wrong.., We canot find data", err };
    }
}


// check for car availbility on specific date

carHelper.checkCarAvaibility = async function (car_id, fromDate, days) {
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
    console.log(toDate);

    var defaultQuery = [
        {
            $lookup: {
                from: 'car_booking',
                foreignField: 'carId',
                localField: '_id',
                as: "carBookingDetails",
            }
        },
        {
            $unwind: {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                _id: 1,
                isDeleted: 1,
                car_book_from_date: {
                    $dateToString: {
                        date: "$carBookingDetails.from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$carBookingDetails.to_time",
                        format: "%Y-%m-%d"
                    }
                }
            }
        },
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { car_book_from_date: { $gt: toDate } },
                            { car_book_to_date: { $lt: fromDate } },
                            { car_book_from_date: { $eq: null } }
                        ]
                    },
                    { isDeleted: false },
                    { _id: ObjectId(car_id) },
                ]
            }
        }
    ];
    try {
        let cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {
            // return { status: 'success', message: "Car data found", data: { cars: cars } }
            return { status: 'success', message: "Car is available on this date" }
        } else {
            return { status: 'failed', message: "Car is not available on this date" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


// // check for car availbility on specific date v2

carHelper.checkCarAvaibility_v2 = async function (car_id, fromDate, days) {
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
    console.log(toDate);

    var defaultQuery = [
        {
            "$match": { "_id": new ObjectId(car_id) }
        },
        {
            "$lookup": {
                "from": "car_booking",
                "foreignField": "carId",
                "localField": "_id",
                "as": "carBookingDetails"
            }
        },
        {
            "$project": {
                "_id": 1,
                "totalBooking": { $size: "$carBookingDetails" },
                "booking": "$carBookingDetails",
            }
        },
        {
            "$unwind": {
                "path": "$booking",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            "$match": {
                "$or": [
                    {
                        $and: [
                            {
                                $or: [
                                    {
                                        "booking.from_time": {
                                            $gt: new Date(toDate)
                                        }
                                    },
                                    {
                                        "booking.to_time": {
                                            $lt: new Date(fromDate)
                                        }
                                    },

                                ]
                            },
                            {
                                "booking.isDeleted": false
                            }
                        ]
                    },
                    { "booking": null }
                ]

            }
        },
        {
            "$group": {
                "_id": "$_id",
                "data": { $first: "$$ROOT" },
                "availableBooking": { $push: "$booking.booking_number" }
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "car": {
                    "$first": "$data"
                },
                "availableBooking": { "$first": "$availableBooking" }
            }
        }
    ];

    var defaultQuery2 = [
        {
            "$match": { "_id": new ObjectId(car_id) }
        },
        {
            "$lookup": {
                "from": "car_booking",
                "foreignField": "carId",
                "localField": "_id",
                "as": "carBookingDetails"
            }
        },

        {
            "$unwind": {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $match:
            {
                //   "$or":[
                //     {"carBookingDetails.isDeleted": false},
                //     {"carBookingDetails":null}
                //   ]
                "$or": [
                    { "carBookingDetails": null },
                    {
                        "$and": [
                            {
                                "carBookingDetails.isDeleted": false
                            },
                            {
                                "carBookingDetails.trip_status": { $ne: "cancelled" }
                            }
                        ]
                    }
                ]
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$push": "$$ROOT"
                },
                "totalBooking": {
                    $push:
                        "$carBookingDetails.booking_number"

                }
            }
        },
        {
            "$unwind": {
                "path": "$data",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            "$match": {
                "$or": [
                    {
                        "data.carBookingDetails.from_time": {
                            "$gt": new Date(toDate)
                        }
                    },
                    {
                        "data.carBookingDetails.to_time": {
                            "$lt": new Date(fromDate)
                        }
                    },
                    {
                        "data.carBookingDetails": null
                    }
                ]
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$first": "$$ROOT"
                },
                "availableBooking": {
                    "$push": "$data.carBookingDetails.booking_number"
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "totalBooking": { $size: "$data.totalBooking" },
                "availableBooking": { $size: "$availableBooking" }
            }
        }
    ]


    console.log('Default Query =>', JSON.stringify(defaultQuery2));

    try {
        let cars = await Car.aggregate(defaultQuery2);

        console.log('DATA=>', JSON.stringify(cars));

        if (cars && cars.length > 0) {

            // return {"status":"success"}

            if (cars[0].totalBooking === cars[0].availableBooking) {
                return { status: 'success', message: "Car is available on this date" }
            }
            else {
                return { status: 'failed', message: "Car is not available on this date" }
            }

            // var finalDaata = cars.filter((c) => {
            //     if (c.car['totalBooking'] === c['availableBooking'].length) {
            //         return true;
            //     }
            // });

            // console.log('Final DATA=>',finalDaata);

            /*
            if (finalDaata && finalDaata.length > 0) {
                finalDaata = finalDaata.map((d) => { return d.car })
                return { status: 'success', message: "Car is available on this date" }
                // return { status: 'success', message: "Car is available on this date", data : finalDaata }
            }
            else {
                return { status: 'failed', message: "Car is not available on this date" }
            }
            */

        } else {
            return { status: 'failed', message: "Car is not available on this date" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


// // check for car availbility on specific date v2

carHelper.checkCarAvaibility_v3 = async function (car_id, fromDate, days,lan_id) {
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");

    var fromDate = moment(fromDate).format("YYYY-MM-DD");
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");

    var fromDateMonth = new Date(fromDate).getMonth() + 1;
    var toDateMonth = new Date(toDate).getMonth() + 1;
    console.log("From Date =>", fromDate);
    console.log("To Date =>", toDate);

    var defaultQuery2 = [
        {
            "$match": { "_id": new ObjectId(car_id) }
        },
        {
            "$lookup": {
                "from": "car_booking",
                "foreignField": "carId",
                "localField": "_id",
                "as": "carBookingDetails"
            }
        },

        {
            "$unwind": {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        }
        /* remove when add cancelled & finished logic
        {
            $match : 
            {
              //   "$or":[
              //     {"carBookingDetails.isDeleted": false},
              //     {"carBookingDetails":null}
              //   ]
              "$or" : [
                  { "carBookingDetails": null},
                  {
                      "$and": [
                                 {
                                   "carBookingDetails.isDeleted": false
                                 },
                                 {
                                    "carBookingDetails.trip_status" : { $ne : "cancelled" } 
                                 }
                              ]
                  },
             ]
            }
        }
        */
        ,
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$push": "$$ROOT"
                },
                "totalBooking": {
                    $push:
                        "$carBookingDetails.booking_number"

                }
            }
        },
        {
            "$unwind": {
                "path": "$data",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            "$match": {
                "$or": [
                    {
                        "data.carBookingDetails.from_time": {
                            "$gt": new Date(toDate)
                        }
                    },
                    {
                        "data.carBookingDetails.to_time": {
                            "$lt": new Date(fromDate)
                        }
                    },
                    {
                        "data.carBookingDetails": null
                    },
                    {
                        "data.carBookingDetails.trip_status": { $in: ["cancelled", "finished"] } // added now 
                    }
                ]
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$first": "$$ROOT"
                },
                "availableBooking": {
                    "$push": "$data.carBookingDetails.booking_number"
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "is_available": "$data.data.is_available",
                "totalBooking": { $size: "$data.totalBooking" },
                "availableBooking": { $size: "$availableBooking" },
                "trip_status": "$data.data.carBookingDetails.trip_status"
            }
        }
    ]


    // console.log('Default Query =>', JSON.stringify(defaultQuery2));

    try {
        let cars = await Car.aggregate(defaultQuery2);

        // console.log('DATA=>', JSON.stringify(cars));

        if (cars && cars.length > 0) {

            // return {"status":"success"}

            if (cars[0].totalBooking === cars[0].availableBooking) {
                // var cnt = 0;
                // cars[0].is_available.map((data,index)=>{
                //     // console.log('datamoth',data.month, 'frommonth==>',fromDateMonth, 'to month===.', toDateMonth);
                //     if (data.month === fromDateMonth || data.month === toDateMonth) {
                //         data.availability.map((av, i) => {
                //             let date = moment(av).format("YYYY-MM-DD");
                //             console.log('date====>', date, 'todate===>', toDate, 'fromDate===>', fromDate);
                //             if (date >= fromDate && date <= toDate) {
                //                 cnt = cnt+1;
                //             }
                //             // u can push match data in one array & return it
                //         });
                //     }
                // });
                // if(cnt >= days){
                //     return { status: 'success', message: "Car is available on this date" }
                // } else {
                //     return { status: 'failed', message: "Car is not available on this date" }
                // }


                availableArray = [];

                if (cars[0].is_available && cars[0].is_available !== true) { // chk when there is array
                    cars[0].is_available.map((data, index) => {
                        var cnt = 0;
                        console.log('datamoth', data.month, 'frommonth==>', fromDateMonth, 'to month===.', toDateMonth);
                        if (data.month === fromDateMonth || data.month === toDateMonth) {
                            data.availability.map((av, i) => {
                                let date = moment(av).utc().startOf('days');
                                if (moment(date).isBetween(fromDate, toDate, null, '[)')) {
                                    cnt++
                                }
                                // u can push match data in one array & return it
                            });
                            // console.log('cnt======>,', cnt, req.body.days);
                            if (cnt >= days) {
                                availableArray.push(cars[0]);
                            }
                        }
                    });
                }

                if (availableArray.length > 0) {
                    if(lan_id == 7){
                        return { status: 'success', message: "السيارة متاحة في هذا التاريخ" }
                    }else{
                        return { status: 'success', message: "Car is available on this date" }
                    }
                   
                } else {
                    if(lan_id == 7){
                        return { status: 'failed', message: "السيارة غير متوفرة في هذا التاريخ" }
                    }else{
                        return { status: 'failed', message: "Car is not available on this date" }
                    }
                    
                }


            }
            else {
                if(lan_id == 7){
                    return { status: 'failed', message: "السيارة غير متوفرة في هذا التاريخ" }
                }else{
                    return { status: 'failed', message: "Car is not available on this date" }
                }
               
            }

            // var finalDaata = cars.filter((c) => {
            //     if (c.car['totalBooking'] === c['availableBooking'].length) {
            //         return true;
            //     }
            // });

            // console.log('Final DATA=>',finalDaata);

            /*
            if (finalDaata && finalDaata.length > 0) {
                finalDaata = finalDaata.map((d) => { return d.car })
                return { status: 'success', message: "Car is available on this date" }
                // return { status: 'success', message: "Car is available on this date", data : finalDaata }
            }
            else {
                return { status: 'failed', message: "Car is not available on this date" }
            }
            */

        } else {
            return { status: 'failed', message: "Car is not available on this date" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


// test extend car avaibility
carHelper.check_extend_availability = async function (car_id, fromDate, days) {
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
    var fromDate = moment(fromDate).format("YYYY-MM-DD");

    // var toDate = moment(fromDate).add(days + 1, 'days').format("YYYY-MM-DD");
    // var fromDate = moment(fromDate).add(1, 'days').format("YYYY-MM-DD");

    var fromDateMonth = new Date(fromDate).getMonth() + 1;
    var toDateMonth = new Date(toDate).getMonth() + 1;
    console.log("From Date =>", fromDate);
    console.log("To Date =>", toDate);

    var defaultQuery2 = [
        {
            "$match": { "_id": new ObjectId(car_id) }
        },
        {
            "$lookup": {
                "from": "car_booking",
                "foreignField": "carId",
                "localField": "_id",
                "as": "carBookingDetails"
            }
        },

        {
            "$unwind": {
                "path": "$carBookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        }
        ,
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$push": "$$ROOT"
                },
                "totalBooking": {
                    $push:
                        "$carBookingDetails.booking_number"

                }
            }
        },
        {
            "$unwind": {
                "path": "$data",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            "$match": {
                "$or": [
                    {
                        "data.carBookingDetails.from_time": {
                            "$gte": new Date(toDate)
                        }
                    },
                    {
                        "data.carBookingDetails.to_time": {
                            "$lte": new Date(fromDate)
                        }
                    },
                    {
                        "data.carBookingDetails": null
                    },
                    {
                        "data.carBookingDetails.trip_status": { $in: ["cancelled", "finished"] } // added now 
                    }
                ]
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "data": {
                    "$first": "$$ROOT"
                },
                "availableBooking": {
                    "$push": "$data.carBookingDetails.booking_number"
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "is_available": "$data.data.is_available",
                "totalBooking": { $size: "$data.totalBooking" },
                "availableBooking": { $size: "$availableBooking" },
                "trip_status": "$data.data.carBookingDetails.trip_status"
            }
        }
    ]


    // console.log('Default Query =>', JSON.stringify(defaultQuery2));

    try {
        let cars = await Car.aggregate(defaultQuery2);

        // console.log('DATA=>', JSON.stringify(cars));

        if (cars && cars.length > 0) {

            // return {"status":"success"}

            if (cars[0].totalBooking === cars[0].availableBooking) {

                availableArray = [];

                if (cars[0].is_available && cars[0].is_available !== true) { // chk when there is array
                    cars[0].is_available.map((data, index) => {
                        var cnt = 0;
                        console.log('datamoth', data.month, 'frommonth==>', fromDateMonth, 'to month===.', toDateMonth);
                        if (data.month === fromDateMonth || data.month === toDateMonth) {
                            data.availability.map((av, i) => {
                                let date = moment(av).utc().startOf('days');
                                if (moment(date).isBetween(fromDate, toDate, null, '[)')) {
                                    cnt++
                                }
                                // u can push match data in one array & return it
                            });
                            // console.log('cnt======>,', cnt, req.body.days);
                            if (cnt >= days) {
                                availableArray.push(cars[0]);
                            }
                        }
                    });
                }

                if (availableArray.length > 0) {
                    return { status: 'success', message: "Car is available on this date" }
                } else {
                    return { status: 'failed', message: "Car is not available on this date" }
                }


            }
            else {
                return { status: 'failed', message: "Car is not available on this date" }
            }

            // var finalDaata = cars.filter((c) => {
            //     if (c.car['totalBooking'] === c['availableBooking'].length) {
            //         return true;
            //     }
            // });

            // console.log('Final DATA=>',finalDaata);

            /*
            if (finalDaata && finalDaata.length > 0) {
                finalDaata = finalDaata.map((d) => { return d.car })
                return { status: 'success', message: "Car is available on this date" }
                // return { status: 'success', message: "Car is available on this date", data : finalDaata }
            }
            else {
                return { status: 'failed', message: "Car is not available on this date" }
            }
            */

        } else {
            return { status: 'failed', message: "Car is not available on this date" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


//carBook
carHelper.carBook = async function (booking_data) {
    let car_booking = new CarBooking(booking_data);
    try {
        let data = await car_booking.save();
        return { status: 'success', message: "Car has been book successfully", data: { booking_data: data } }
    } catch (err) {
        return { status: 'failed', message: "Error occured while booking car", err };
    }
};

// cancel car booking
carHelper.cancelBooking = async function (data) {
    try {
        // var condition = {
        //     $and: [
        //         { userId: new ObjectId(data.userId) },
        //         { carId: new ObjectId(data.carId) }
        //     ]
        // }

        /* calculate cancellation charge START */



        var default_query = [
            {
                $match: { "booking_number": { $eq: data.booking_number } }
            },
            {
                $lookup: {
                    from: 'cars',
                    foreignField: '_id',
                    localField: 'carId',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company_terms_and_condition',
                    foreignField: 'CompanyId',
                    localField: 'car_details.car_rental_company_id',
                    as: 'car_company_terms_and_condition_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_company_terms_and_condition_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    "total_booking_amount": 1,
                    "carId": 1,
                    "userId": 1,
                    "from_time": 1,
                    "to_time": 1,
                    "booking_rent": 1,
                    "days": 1,
                    "booking_number": 1,
                    "companyId": "$car_company_terms_and_condition_details.CompanyId",
                    "cancellation_policy_criteria": "$car_company_terms_and_condition_details.cancellation_policy_criteria"
                }
            }
        ];

        var cancelletion_rates = await CarBooking.aggregate(default_query);

        console.log('DATA==>', cancelletion_rates);
        var total_booking_amount = cancelletion_rates[0].total_booking_amount;
        var booking_rate = cancelletion_rates[0].booking_rent;
        var no_of_days = cancelletion_rates[0].days;

        var cancel_date = new Date(data.cancel_date);
        var cnl_date = cancel_date.toISOString();

        // hours diff

        var Db_from_date = moment(cancelletion_rates[0].from_time); // db date 
        var Cancel_date1 = moment(cnl_date); // user paasing date

        var diff_hours = Db_from_date.diff(Cancel_date1, 'hours');
        // var diff_hours = 12;
        var cancel_charge;
        var amount_return_to_user;

        console.log('Hours Diffrence : ', diff_hours);

        var cancellation_rates_list = cancelletion_rates[0].cancellation_policy_criteria;

        console.log('Cancel rate list=>', cancellation_rates_list);

        var final_rate_percentage = null;
        var flagGot = false;
        if (cancellation_rates_list.length > 0) {
            cancellation_rates_list.forEach(rate => {
                if (rate.hours >= diff_hours && !flagGot) {
                    flagGot = true;
                    final_rate_percentage = rate.rate;
                }
            });
        }
        console.log("final_rate_percentage", final_rate_percentage);

        if (final_rate_percentage !== null) {

            cancel_charge = (total_booking_amount * final_rate_percentage) / 100;
            amount_return_to_user = total_booking_amount - cancel_charge;

            console.log('CANCAL CHARGE : ', cancel_charge);
            console.log('Amount return to user  : ', amount_return_to_user);
        }
        else {
            final_rate_percentage = null;
            cancel_charge = 0;
            amount_return_to_user = booking_rate * no_of_days;
            console.log('CANCAL CHARGE : ', cancel_charge);
            console.log('Amount return to user  : ', amount_return_to_user);
        }

        // return { "status": "success", data: cancelletion_rates }


        /* ---------cancellation charge over-------------- */

        var condition = { 'booking_number': data.booking_number }
        var update_data = { $set: { cancel_date: data.cancel_date, cancel_reason: data.cancel_reason, trip_status: data.trip_status } };
        var update_data2 = {
            $set: {
                cancel_date: data.cancel_date,
                cancel_reason: data.cancel_reason,
                trip_status: data.trip_status,
                transaction_status: "cancelled",
                cancellation_rate: final_rate_percentage,
                cancellation_charge: cancel_charge,
                amount_return_to_user: amount_return_to_user
            }
        };

        var datta = await CarBooking.update(condition, update_data2);
        if (datta && datta.n > 0) {

            var update_carAssign = await CarAssign.updateOne(condition, update_data);
            if(data.lan_id == 7){
                return { status: 'success', message: "تم إلغاء حجز سيارتك بنجاح" }
            }else{
                return { status: 'success', message: "Your car booking has been cancelled successfully" }
            }
            
        }
        else {
            if(data.lan_id == 7){
                return { status: 'failed', message: "حدث خطأ أثناء إلغاء حجز سيارتك" }
            }else{
                return { status: 'failed', message: "Error occured while cancelling your car booking" }
            }
           
        }
    }
    catch (err) {

        if(data.lan_id == 7){
            return { status: 'failed', message: "حدث خطأ أثناء إلغاء حجز سيارتك" }
        }else{
            return { status: 'failed', message: "Error occured while cancelling your car booking" }
        }
       
    }
}


// Check_Service_Availibility
carHelper.Check_Service_Availibility = async function (data) {
    try {
        if (data.type === 'country') {
            var data = await Country.find({}).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available country list", data: { country: data } }
            }
            else {
                return { status: 'failed', message: "No country available" }
            }
        }
        else if (data.type === 'state') {
            var data = await State.find({ country_id: ObjectId(data.id) }).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available state list", data: { state: data } }
            }
            else {
                return { status: 'failed', message: "No state available for this country" }
            }
        }
        else if (data.type === 'city') {
            var data = await City.find({ state_id: ObjectId(data.id) }).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available city list", data: { city: data } }
            }
            else {
                return { status: 'failed', message: "No city available for this state" }
            }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while fetching country -> State -> City data" }
    }
}


// check radius
carHelper.checkRadius = async function (data) {
    try {
        // for 100 meter radius
        let radius = await CarCompany.aggregate([{
            $match: {
                $and: [
                    { _id: new ObjectId(data.company_id) }, //0.621371 1 km  // 62.1371 = 100km
                    { service_location: { $geoWithin: { $centerSphere: [[data.longitude, data.latitude], 62.1371 / 3963.2] } } }

                ]
            }
        }]
        );
        if (radius && radius.length > 0) {
            return { status: 'success', message: "Service is available to your location", data: { rental_company: radius } }
        }
        else {
            return { status: 'failed', message: "Service is not available to your location " }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while mapping radius", err }
    }
}


// check radius v2
carHelper.checkRadius_v2 = async function (data) {
    try {
        // for 100 meter radius
        let radius = await CarCompany.aggregate([
            {
                $project: {
                    "city": { $toLower: "$company_address.city" }
                }
            },
            {
                $match: {
                    $and: [
                        { _id: new ObjectId(data.company_id) }, //0.621371 1 km  // 62.1371 = 100km
                        // { service_location: { $geoWithin: { $centerSphere: [[data.longitude, data.latitude], 62.1371 / 3963.2] } } }
                        { "city": { $eq: data.city } } // lowercase here
                    ]
                }
            }
        ]
        );
        if (radius && radius.length > 0) {
             if(data.lan_id ==7){
                return { status: 'success', message: "الخدمة متاحة لموقعك" }                
            }else{
                return { status: 'success', message: "Service is available to your location" }
            }
        }
        else {
              if(data.lan_id ==7){
                    return { status: 'failed', message: "الخدمة غير متوفرة لموقعك" }                
                }else{
                    return { status: 'failed', message: "Service is not available to your location" }
                }
        }
    } catch (err) {
         if(data.lan_id == 7){
            return { status: 'failed', message: "حدث خطأ أثناء تعيين نصف القطر" }                
        }else{
            return { status: 'failed', message: "Error occured while mapping radius", err }
        }
    }
}



// car_handover for agent app

carHelper.car_handover = async (req, car_handover_data) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': JSON.parse(car_handover_data.defected_points),
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

            }


            /** Save data ith signature */
            if (req.files.signature) {
                var mimetype = config.mimetypes;
                if (mimetype.indexOf(req.files.signature.mimetype) != -1) {
                    // upload now
                    console.log('Comming');
                    var file = req.files.signature; // store entire file object
                    var dir = "./upload/signature";
                    extention = paths.extname(file.name);
                    savefilename = "signature_" + Date.now() + extention;
                    var makeEntry = 1;
                    await file.mv(dir + '/' + savefilename, async function (err) {
                        if (err) {
                            makeEntry = 0;
                            return { status: "failed", message: "Error accured while uplaod signature" };
                        }
                        else {
                            console.log('HHHHHHHHHHHHH');
                        }
                    });

                    if (makeEntry == 1) {
                        car_hand_over_data.signature = savefilename;
                        car_hand_over_data.car_defects_gallery = gallaryArray;

                        let car_hand_over = new CarHandOver(car_hand_over_data);
                        let data = await car_hand_over.save();

                        // after car handnover we need to change car booking status to -> in-progress
                        let booking_number = { booking_number: car_hand_over_data.booking_number };
                        let trip_status = { $set: { trip_status: 'inprogress' } };

                        var bookingUpdate = await CarBooking.updateOne(booking_number, trip_status);

                        if (bookingUpdate && bookingUpdate.n > 0) {
                            // update data in car_assign_agent table as well
                            var car_assign_agent_Update = await CarAssign.updateOne(booking_number, trip_status);

                            if (car_assign_agent_Update && car_assign_agent_Update.n > 0) {
                                return { status: "success", message: "Car hand over successfully" };
                            }
                            else {
                                return { status: "failed", message: "Error accured while update car_agent_assign collection" };
                            }
                        }
                        else {
                            return { status: "failed", message: "Error accured while update car booking collection" };
                        }

                        // return { status: "success", message: "Car hand over successfully" };
                    }
                    else {
                        return { status: "failed", message: "Error accured while uplaod signature" };
                    }
                }
                else {
                    return { status: 'failed', message: "Enter valid signature formate" };
                }
            }
            else {
                return { status: 'failed', message: "Please enter your signature" };
            }
            // Signature save
        }
        else {
            return { status: 'failed', message: "Please enter signature" };
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while hand over car", err }
    }
};


// car delivering process

carHelper.car_delivering = async (req, car_handover_data) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': JSON.parse(car_handover_data.defected_points),
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        var gallaryArray = [];
        var makeEntry = 1;
        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                // var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                // var makeEntry = 1;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            makeEntry = 0;
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

            }

            /** Save data ith signature */
            // Signature save
        }

        if (makeEntry == 1) {
            // car_hand_over_data.signature = savefilename;
            car_hand_over_data.car_defects_gallery = gallaryArray;

            let car_hand_over = new CarHandOver(car_hand_over_data);
            let data = await car_hand_over.save();

            // after car handnover we need to change car booking status to -> in-progress
            let booking_number = { booking_number: car_hand_over_data.booking_number };
            let trip_status = { $set: { trip_status: 'delivering' } };

            var bookingUpdate = await CarBooking.updateOne(booking_number, trip_status);

            if (bookingUpdate && bookingUpdate.n > 0) {
                // update data in car_assign_agent table as well
                var car_assign_agent_Update = await CarAssign.updateOne(booking_number, trip_status);

                if (car_assign_agent_Update && car_assign_agent_Update.n > 0) {
                    return { status: "success", message: "Start car delivering process" };
                }
                else {
                    return { status: "failed", message: "Error accured while update car_agent_assign collection" };
                }
            }
            else {
                return { status: "failed", message: "Error accured while update car booking collection" };
            }

            // return { status: "success", message: "Car hand over successfully" };
        }
        else {
            return { status: "failed", message: "Error accured while upload car defected images to server" };
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while car delivering", err }
    }
};

// car delivering process

carHelper.car_delivering_v2 = async (req, car_handover_data, locationData) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': JSON.parse(car_handover_data.defected_points),
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        var gallaryArray = [];
        var makeEntry = 1;
        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                // var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                // var makeEntry = 1;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            makeEntry = 0;
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

            }

            /** Save data ith signature */
            // Signature save
        }

        if (makeEntry == 1) {
            // car_hand_over_data.signature = savefilename;
            car_hand_over_data.car_defects_gallery = gallaryArray;

            let car_hand_over = new CarHandOver(car_hand_over_data);
            let data = await car_hand_over.save();

            // after car handnover we need to change car booking status to -> in-progress
            let booking_number = { booking_number: car_hand_over_data.booking_number };
            let trip_status = { $set: locationData };

            var bookingUpdate = await CarBooking.updateOne(booking_number, trip_status);

            if (bookingUpdate && bookingUpdate.n > 0) {
                // update data in car_assign_agent table as well
                var car_assign_agent_Update = await CarAssign.updateOne(booking_number, trip_status);

                if (car_assign_agent_Update && car_assign_agent_Update.n > 0) {
                    return { status: "success", message: "Start car delivering process" };
                }
                else {
                    return { status: "failed", message: "Error accured while update car_agent_assign collection" };
                }
            }
            else {
                return { status: "failed", message: "Error accured while update car booking collection" };
            }

            // return { status: "success", message: "Car hand over successfully" };
        }
        else {
            return { status: "failed", message: "Error accured while upload car defected images to server" };
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while car delivering", err }
    }
};

//car_handover_v2
carHelper.car_handover_v2 = async (req, booking_number, car_handover_data) => {
    try {


        // let car_hand_over_data = {
        //     'user_id': car_handover_data.user_id,
        //     'car_id': car_handover_data.car_id,
        //     'car_rental_company_id': car_handover_data.car_rental_company_id,//
        //     'agent_id': car_handover_data.agent_id,
        //     'defected_points': car_handover_data.defected_points,
        //     'milage': car_handover_data.milage,
        //     'petrol_tank': car_handover_data.petrol_tank,
        //     'notes': car_handover_data.notes ? car_handover_data.notes : null,
        //     'booking_number': car_handover_data.booking_number
        // }
        // console.log('HElper =>', req.files)

        if (req.files) {
            /** Save data ith signature */
            if (req.files.signature) {
                var mimetype = config.mimetypes;
                if (mimetype.indexOf(req.files.signature.mimetype) != -1) {
                    // upload now
                    console.log('Comming');
                    var file = req.files.signature; // store entire file object
                    var dir = "./upload/signature";
                    var extention = paths.extname(file.name);
                    var savefilename = "signature_" + Date.now() + extention;
                    var makeEntry = 1;
                    await file.mv(dir + '/' + savefilename, async function (err) {
                        if (err) {
                            makeEntry = 0;
                            return { status: "failed", message: "Error accured while uplaod signature" };
                        }
                        else {
                            console.log('HHHHHHHHHHHHH');
                        }
                    });

                    if (makeEntry == 1) {
                        var car_hand_over_data = car_handover_data;
                        car_hand_over_data.signature = savefilename;

                        // update collection car_handover

                        var cond = { booking_number: booking_number };
                        var setData = { $set: car_hand_over_data };

                        var updateCarHandover = await CarHandOver.updateOne(cond, setData);

                        if (updateCarHandover && updateCarHandover.n > 0) {
                            // after car handnover we need to change car booking status to -> in-progress
                            let book_number = { booking_number: booking_number };
                            let trip_status = { $set: { trip_status: 'inprogress' } };

                            var bookingUpdate = await CarBooking.updateOne(book_number, trip_status);

                            if (bookingUpdate && bookingUpdate.n > 0) {
                                // update data in car_assign_agent table as well
                                var car_assign_agent_Update = await CarAssign.updateOne(book_number, trip_status);

                                if (car_assign_agent_Update && car_assign_agent_Update.n > 0) {
                                    return { status: "success", message: "Car hand over successfully" };
                                }
                                else {
                                    return { status: "failed", message: "Error accured while update car_agent_assign collection" };
                                }
                            }
                            else {
                                return { status: "failed", message: "Error accured while update car booking collection" };
                            }

                        }
                        else {
                            return { status: "failed", message: "Error accured while update car handover collection" };
                        }


                        // return { status: "success", message: "Car hand over successfully" };
                    }
                    else {
                        return { status: "failed", message: "Error accured while uplaod signature" };
                    }
                }
                else {
                    return { status: 'failed', message: "Enter valid signature formate" };
                }
            }
            else {
                return { status: 'failed', message: "Please enter your signature" };
            }
            // Signature save
        }
        else {
            return { status: 'failed', message: "Please enter signature" };
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while hand over car", err }
    }
};


// car_receive for agent app
carHelper.car_receive = async (req, car_handover_data) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': JSON.parse(car_handover_data.defected_points),
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

                console.log('Should come after==>');

                car_hand_over_data.car_defects_gallery = gallaryArray;
            }
        }


        // car_hand_over_data.car_defects_gallery = gallaryArray;

        let car_receive_data = new CarReceive(car_hand_over_data);
        let data = await car_receive_data.save();

        // after car receive we need to change car booking status to -> finished
        let booking_number = { booking_number: car_hand_over_data.booking_number };
        // let trip_status = { $set: { trip_status: 'finished' } };
        let trip_status = { $set: { trip_status: 'finished', transaction_status: 'successfull', transaction_date: moment().format('YYYY-MM-DD') } };
        let trip_status2 = { $set: { trip_status: 'finished' } };

        var updateCarBooking = await CarBooking.updateOne(booking_number, trip_status);

        if (updateCarBooking && updateCarBooking.n > 0) {
            // var updateCarAssign = await CarAssign.updateOne(booking_number, trip_status);
            var updateCarAssign = await CarAssign.updateMany(booking_number, trip_status2, { multi: true });
            if (updateCarAssign && updateCarAssign.n > 0) {
                return { status: "success", message: "Car has been receive successfully" };
            }
            else {
                return { status: 'failed', message: "Error accured while update car assign collection" }
            }
        }
        else {
            return { status: 'failed', message: "Error accured while update car booking collection" }
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while receive car", err }
    }
};



// Car report list user wise
carHelper.car_report_list = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_details.car_model_id',
                    as: 'model_details'
                }
            },
            {
                $unwind: {
                    "path": "$model_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_details.car_brand_id',
                    as: 'brand_details'
                }
            },
            {
                $unwind: {
                    "path": "$brand_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year"
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId(user_id),
                //     'from_time': {
                //         $gte: new Date(),
                //     }
                // }
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'trip_status': { $in: ["inprogress", "finished", "upcoming"] }
                }
            }

        ]);
        if (data && data.length > 0) {
            return { status: 'success', message: "Car Reported list", data: { car_report_list: data } }
        }
        else {
            return { status: 'failed', message: "No car reported yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car report list" };
    }
};


// Report a car save into car_report collection
carHelper.car_report = async (report_data) => {
    try {

        const condition = {
            user_id: report_data.user_id,
            car_id: report_data.car_id,
            report_type: report_data.report_type
        }

        var report = await CarReport.find(condition).lean().exec();

        if (report && report.length < 1) {
            let car_report_data = new CarReport(report_data);

            let data = await car_report_data.save();

            return { status: "success", message: "Thank you for reporting a car, our team will get back to you soon!" };
        }
        else {
            if (report[0].status === 'pending') {
                // return { status: "failed", message: "Your reported car is pending"};
                return { status: "failed", message: "You already reported this issues, we will get back to you soon!" };
            }
            else if (report[0].status === 'resolved') {
                // return { status: "failed", message: "Your reported car is resolved"};
                return { status: "failed", message: "Reported issues resolved, please check your email" };
            }
            else {
                return { status: "failed", message: "No status" };
            }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error accured while reporting car", err }
    }
};


// Resend invoice to customer via email
carHelper.resend_invoice = async (booking_number, email) => {
    try {
        let data = await CarBooking.aggregate([
            {
                $match: {
                    'isDeleted': false,
                    'booking_number': booking_number
                }
            },
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_details.car_model_id',
                    as: 'model_details'
                }
            },
            {
                $unwind: {
                    "path": "$model_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_details.car_brand_id',
                    as: 'brand_details'
                }
            },
            {
                $unwind: {
                    "path": "$brand_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: "car_company",
                    foreignField: "_id",
                    localField: "car_details.car_rental_company_id",
                    as: 'carCompany_details'
                }
            },
            {
                $unwind: {
                    "path": "$carCompany_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year",
                    "car_details.car_company_name": "$carCompany_details.name"
                }
            }
        ]);
        if (data && data.length > 0) {

            // console.log('DATA==>', JSON.stringify(data));

            var invoiceData = await invoiceHelper.Userinvoice(data[0]._id); // booking_id

            var superAdminData = await User.find({ "type": "admin", isDeleted: false });

            // console.log('Rd Invoice DATA =>', JSON.stringify(invoiceData));


            var invoiceData = JSON.parse(JSON.stringify(invoiceData));

            invoiceData.data['age_of_car'] = data[0].car_details.age_of_car;
            invoiceData.data['car_class'] = data[0].car_details.car_class;
            invoiceData.data['from_date'] = moment(data[0].from_time).format('YYYY-MM-DD');


            invoiceData.data['support_phone_number'] = superAdminData && superAdminData.length > 0 ? '+' + superAdminData[0].support_country_code + ' ' + superAdminData[0].support_phone_number : '';
            invoiceData.data['support_email'] = email;//superAdminData && superAdminData.length > 0 ? superAdminData[0].support_email : '';
            invoiceData.data['carImagePath'] = config.CAR_IMAGES;
            invoiceData.data['icons'] = config.ICONS;

            console.log("DM invoiceData=>", JSON.stringify(invoiceData.data))

            // send email to customer's email
            var options = {
                to: email,
                // to: 'dm@narola.email',
                subject: 'ABHR - Resend Invoice'
            }
            let mail_resp = await mail_helper.Resend_Invoice("resend_invoice", options, invoiceData.data);

            console.log('Mail Response ===>', mail_resp);

            if (mail_resp.status === 'success') {
                return { status: 'success', message: "Email has been sent to your email address" }
            }
            else {
                return { status: 'failed', message: "Error accures while sending email to you" }
            }
        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking history", err };
    }
};


// change car booking details
carHelper.change_carBook = async (booking_number, data) => {
    try {
        var data = await CarBooking.updateOne({ "booking_number": booking_number }, { $set: data });
        if (data && data.n > 0) {
            return { status: 'success', message: "Car booking details has been changed" }
        }
        else {
            return { status: 'failed', message: "Car booking details has not been changed" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while change car booking details" };
    }
};


// Assign car to agent for delivery
carHelper.assign_car_to_agent = async (data) => {
    let car_assign = new CarAssign(data);
    try {
        var save_data = await car_assign.save()
        return { status: 'success', message: "Car has been assign to you" }
    } catch (err) {
        return { status: 'failed', message: "Error occured while assign car to agent" };
    }
};


// Get email id 
carHelper.get_email = async function (id) {
    try {
        // var data = await User.updateOne({ _id : new ObjectId(user_id)}, { $set : { password : bcrypt.hashSync(password, SALT_WORK_FACTOR)  } } );
        var data = await User.find({ _id: new ObjectId(id), isDeleted: false });
        if (data && data.length > 0) {
            return { status: 'success', message: "Get email successfully" }
        }
        else {
            return { status: 'failed', message: "Get email failure" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching email", err };
    }
};

// Get email id
carHelper.get_booking_id = async function (booking_number) {
    try {
        // var data = await User.updateOne({ _id : new ObjectId(user_id)}, { $set : { password : bcrypt.hashSync(password, SALT_WORK_FACTOR)  } } );
        var data = await CarBooking.findOne({ booking_number: { $eq: booking_number } ,isDeleted : false });

        if (data) {
            return { status: 'success', id: data._id }
        }
        else {
            return { status: 'failed', message: "Get email failure" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching email", err };
    }
};



module.exports = carHelper;
